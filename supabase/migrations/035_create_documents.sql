-- Create documents table for the Document Center feature
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type e.g. "application/pdf" or "image/jpeg"
  file_size INTEGER,       -- size in bytes
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('contract', 'receipt', 'floor_plan', 'timeline', 'other')),
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_wedding_id ON documents(wedding_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- No public policies — admin-only access via service role
