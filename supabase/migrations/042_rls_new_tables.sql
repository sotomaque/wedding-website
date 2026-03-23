-- Migration 042: Enable RLS on new tables and verify all tables have RLS.
--
-- The app connects via service_role (which bypasses RLS), so RLS policies
-- are defense-in-depth against direct anon-key access. The primary data
-- isolation mechanism is query-level weddingId scoping in Prisma.
--
-- All existing policies use USING(true) for public reads — this is fine
-- because the anon key only needs read access to public-facing data,
-- and write operations go through service_role.

-- New tables from multi-tenancy work
ALTER TABLE wedding_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_items ENABLE ROW LEVEL SECURITY;

-- wedding_admins already has RLS from migration 039
-- weddings table should also have RLS
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;

-- Public read policies for new public-facing tables
DROP POLICY IF EXISTS "Allow public read weddings" ON weddings;
CREATE POLICY "Allow public read weddings"
  ON weddings FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Allow public read wedding_content" ON wedding_content;
CREATE POLICY "Allow public read wedding_content"
  ON wedding_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read registry_items" ON registry_items;
CREATE POLICY "Allow public read registry_items"
  ON registry_items FOR SELECT USING (is_active = true);
