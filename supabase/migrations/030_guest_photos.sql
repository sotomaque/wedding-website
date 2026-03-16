create table if not exists guest_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  uploader_name text,
  is_visible boolean not null default true,
  uploaded_at timestamptz not null default now(),
  hidden_at timestamptz,
  hidden_by text
);

alter table guest_photos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'guest_photos'
    and policyname = 'Public can view visible guest photos'
  ) then
    create policy "Public can view visible guest photos"
      on guest_photos for select
      using (is_visible = true);
  end if;
end $$;
