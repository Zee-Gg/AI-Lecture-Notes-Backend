-- Enable pgvector
create extension if not exists vector;

-- Tables
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamp with time zone default now()
);

create table lectures (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  title text not null,
  audio_url text,
  transcript_text text,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid references lectures(id) not null,
  concepts jsonb,
  definitions jsonb,
  formulas jsonb,
  emphasized_points jsonb
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid references lectures(id) not null,
  course_id uuid references courses(id) not null,
  content text not null,
  embedding vector(1536),
  start_time float,
  end_time float
);

alter table chunks alter column embedding type vector(1024);

create or replace function match_chunks(
  query_embedding vector(1024),
  match_course_id uuid,
  match_count int default 6
)
returns table (
  id uuid,
  lecture_id uuid,
  content text,
  start_time float,
  end_time float,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.lecture_id,
    chunks.content,
    chunks.start_time,
    chunks.end_time,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where chunks.course_id = match_course_id
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;

alter table lectures add column transcript_segments jsonb;