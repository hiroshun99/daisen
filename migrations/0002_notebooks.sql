-- Notebooks: one row is the unit of storage (title + body + summary).
-- Tags live in notebook_tags so we can DISTINCT per user for reuse suggestions.
-- user_id is TEXT to match Better Auth ids (and the preview 'dev-user').

create table if not exists notebooks (
  id          text primary key,
  user_id     text not null,
  title       text not null,
  body        text not null,
  summary     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notebooks_user_created_idx
  on notebooks (user_id, created_at desc);

create table if not exists notebook_tags (
  notebook_id text not null references notebooks (id) on delete cascade,
  tag         text not null,
  primary key (notebook_id, tag)
);

create index if not exists notebook_tags_tag_idx on notebook_tags (tag);
