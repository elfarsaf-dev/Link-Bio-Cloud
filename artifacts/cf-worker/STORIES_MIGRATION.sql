-- Jalankan di Supabase SQL Editor untuk fitur Story 24 jam
create table if not exists lh_stories (
  id          uuid primary key,
  user_id     uuid not null references lh_users(id) on delete cascade,
  text        text,
  media_url   text,
  media_type  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists lh_stories_user_id_idx on lh_stories(user_id);
create index if not exists lh_stories_expires_at_idx on lh_stories(expires_at);
