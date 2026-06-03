-- Migration 069: WordPress-style photo placements.
--
-- Photos (the `photos` table) become a media LIBRARY. A new join table
-- `photo_placements` records which library photo renders in which home-page
-- section (hero/story/gallery) and in what per-section order. A photo can be
-- placed in multiple sections, once each (unique photo_id + section).
--
-- The public page reads each section's placements in display_order instead of
-- the old random shuffle. See apps/web/lib/photos.ts (getPhotosBySection) and
-- apps/web/lib/templates.ts (getPhotoSections) for the app-side logic.

-- 1. Section enum (idempotent — CREATE TYPE has no IF NOT EXISTS).
do $$
begin
  create type photo_section as enum ('hero', 'story', 'gallery');
exception
  when duplicate_object then null;
end $$;

-- 2. Placement table.
create table if not exists photo_placements (
  id            uuid primary key default gen_random_uuid(),
  photo_id      uuid not null references photos(id) on delete cascade,
  wedding_id    uuid not null references weddings(id) on delete cascade,
  section       photo_section not null,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  constraint photo_placements_photo_section_unique unique (photo_id, section)
);

create index if not exists idx_photo_placements_wedding_section
  on photo_placements (wedding_id, section);

-- 3. RLS: public read; all writes go through service_role (bypasses RLS).
alter table photo_placements enable row level security;

drop policy if exists "Allow public read photo_placements" on photo_placements;
create policy "Allow public read photo_placements"
  on photo_placements for select using (true);

-- 4. Backfill so existing sites render identically after deploy.
--
-- Photo-consuming sections depend on the wedding's template, which lives in
-- app code (apps/web/lib/templates.ts → getPhotoSections). With exactly two
-- presets today the rule is encoded as data here. IMPORTANT: if presets change,
-- update BOTH this backfill and getPhotoSections.
--   - classic           (template_id NULL or 'classic'): hero + story
--   - elegant  (template_id 'elegant'): hero + gallery
-- All inserts are idempotent via ON CONFLICT on the (photo_id, section) unique.

-- hero: every wedding's active photos.
insert into photo_placements (photo_id, wedding_id, section, display_order)
select p.id, p.wedding_id, 'hero'::photo_section, p.display_order
from photos p
where p.is_active = true
on conflict (photo_id, section) do nothing;

-- story: classic weddings only (elegant story is prose-only).
insert into photo_placements (photo_id, wedding_id, section, display_order)
select p.id, p.wedding_id, 'story'::photo_section, p.display_order
from photos p
join weddings w on w.id = p.wedding_id
where p.is_active = true
  and coalesce(w.template_id, 'classic') <> 'elegant'
on conflict (photo_id, section) do nothing;

-- gallery: elegant weddings only (classic layout has no gallery).
insert into photo_placements (photo_id, wedding_id, section, display_order)
select p.id, p.wedding_id, 'gallery'::photo_section, p.display_order
from photos p
join weddings w on w.id = p.wedding_id
where p.is_active = true
  and w.template_id = 'elegant'
on conflict (photo_id, section) do nothing;
