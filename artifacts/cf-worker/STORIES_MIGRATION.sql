CREATE TABLE IF NOT EXISTS lh_stories (
  id         uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES lh_users(id) ON DELETE CASCADE,
  text       text,
  media_url  text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS lh_stories_user_id_idx ON lh_stories(user_id);
CREATE INDEX IF NOT EXISTS lh_stories_expires_at_idx ON lh_stories(expires_at);
