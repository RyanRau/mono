-- Run this migration in your Nhost dashboard (Hasura console → SQL)
-- This creates the photos table and configures Hasura permissions

CREATE TABLE public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cdn_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for filtering public photos
CREATE INDEX idx_photos_is_public ON public.photos (is_public, created_at DESC);

-- Track the table in Hasura metadata
-- (After running this SQL, go to Hasura Console → Data → Track "photos" table)

-- Then configure permissions in Hasura Console:
--
-- SELECT permissions:
--   Role "public" → Filter: { "is_public": { "_eq": true } }
--     Columns: id, cdn_url, alt_text, is_public, created_at
--
--   Role "user" → Filter: {} (no filter — authenticated users see all photos)
--     Columns: id, cdn_url, alt_text, is_public, user_id, created_at
--
-- INSERT permissions:
--   Role "user" → Column presets: user_id = x-hasura-user-id
--     Columns: cdn_url, alt_text, is_public
--
-- UPDATE permissions:
--   Role "user" → Filter: { "user_id": { "_eq": "x-hasura-user-id" } }
--     Columns: alt_text, is_public
--
-- DELETE permissions:
--   Role "user" → Filter: { "user_id": { "_eq": "x-hasura-user-id" } }
