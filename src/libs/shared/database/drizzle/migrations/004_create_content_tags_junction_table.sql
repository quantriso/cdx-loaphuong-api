-- Migration: Create Content Tags Junction Table
-- Story: 4.5 - Filter Content by Category & Tags
-- Date: 2026-01-29
-- Description: Migrates from JSONB tags to normalized junction table

-- Step 1: Create content_tags junction table
CREATE TABLE IF NOT EXISTS content_tags (
  content_id VARCHAR(36) NOT NULL,
  tag_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (content_id, tag_id)
);

-- Step 2: Add foreign key constraints
ALTER TABLE content_tags
  ADD CONSTRAINT fk_content_tags_content
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE;

ALTER TABLE content_tags
  ADD CONSTRAINT fk_content_tags_tag
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);

-- Step 4: Migrate existing data from JSONB to junction table
-- This script handles migration of tag slugs from JSONB array to junction table
-- Note: This assumes tags column contains array of tag slugs like ["covid", "health"]

DO $$
DECLARE
  content_record RECORD;
  tag_slug TEXT;
  tag_record RECORD;
BEGIN
  -- Loop through all contents that have tags in JSONB
  FOR content_record IN
    SELECT id, tenant_id, tags
    FROM contents
    WHERE tags IS NOT NULL
      AND jsonb_array_length(tags) > 0
  LOOP
    -- Loop through each tag slug in the JSONB array
    FOR tag_slug IN
      SELECT jsonb_array_elements_text(content_record.tags)
    LOOP
      -- Find the tag by slug and tenant
      SELECT id INTO tag_record
      FROM tags
      WHERE slug = tag_slug
        AND tenant_id = content_record.tenant_id
        AND is_deleted = FALSE
      LIMIT 1;

      -- If tag exists, create junction record
      IF FOUND THEN
        INSERT INTO content_tags (content_id, tag_id, created_at)
        VALUES (content_record.id, tag_record.id, NOW())
        ON CONFLICT (content_id, tag_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Step 5: (Optional) Drop old tags JSONB column
-- Commented out for safety - can be run manually after verifying migration
-- ALTER TABLE contents DROP COLUMN IF EXISTS tags;

-- Verification query (run manually to check migration)
-- SELECT
--   c.id as content_id,
--   c.title,
--   c.tags as old_jsonb_tags,
--   array_agg(t.slug) as new_junction_tags
-- FROM contents c
-- LEFT JOIN content_tags ct ON c.id = ct.content_id
-- LEFT JOIN tags t ON ct.tag_id = t.id
-- GROUP BY c.id, c.title, c.tags
-- HAVING jsonb_array_length(c.tags) > 0;
