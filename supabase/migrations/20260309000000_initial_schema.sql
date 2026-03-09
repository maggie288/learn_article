create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar_url text,
  knowledge_level text default 'explorer',
  preferred_language text default 'zh-CN',
  referrer_id uuid references users(id),
  stripe_customer_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  stripe_subscription_id text unique not null,
  plan text not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists usage_quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  period text not null,
  courses_generated integer default 0,
  unique(user_id, period)
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  url text unique not null,
  slug text unique,
  title text,
  authors text[],
  abstract text,
  raw_content jsonb,
  concept_graph jsonb,
  thinking_chain jsonb,
  extraction_meta jsonb,
  extraction_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) not null,
  user_id uuid references users(id),
  difficulty text not null,
  language text default 'zh-CN',
  path_config jsonb,
  quality_scores jsonb,
  status text default 'queued',
  version integer default 1,
  total_chapters integer,
  estimated_minutes integer,
  blog_html text,
  podcast_url text,
  short_video_url text,
  view_count integer default 0,
  created_at timestamptz default now(),
  published_at timestamptz
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  order_index integer not null,
  title text not null,
  subtitle text,
  narration text not null,
  narration_ssml text,
  svg_components jsonb,
  analogies jsonb,
  quiz_questions jsonb,
  code_snippets jsonb,
  audio_url text,
  audio_duration_seconds integer,
  source_citations jsonb,
  concept_names text[],
  created_at timestamptz default now()
);

create table if not exists concepts (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  domain text,
  difficulty_level float,
  description text,
  common_misconceptions text[],
  best_analogies jsonb,
  usage_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists concept_edges (
  id uuid primary key default gen_random_uuid(),
  from_concept_id uuid references concepts(id),
  to_concept_id uuid references concepts(id),
  relation_type text,
  strength float default 1.0,
  unique(from_concept_id, to_concept_id)
);

create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  course_id uuid references courses(id) not null,
  chapter_id uuid references chapters(id) not null,
  status text default 'not_started',
  quiz_score float,
  quiz_answers jsonb,
  time_spent_seconds integer default 0,
  completed_at timestamptz,
  unique(user_id, chapter_id)
);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  course_id uuid references courses(id) not null,
  achievement_type text not null,
  badge_image_url text,
  shared boolean default false,
  created_at timestamptz default now(),
  unique(user_id, course_id, achievement_type)
);

create table if not exists user_favorites (
  user_id uuid references users(id) not null,
  course_id uuid references courses(id) not null,
  created_at timestamptz default now(),
  primary key(user_id, course_id)
);

create table if not exists verification_logs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  check_type text not null,
  score float not null,
  details jsonb,
  passed boolean not null,
  model_used text,
  created_at timestamptz default now()
);

create table if not exists referral_stats (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references users(id) not null,
  referred_user_id uuid references users(id) not null,
  subscription_id uuid references subscriptions(id),
  commission_amount float,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  event_type text not null,
  event_data jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_sources_slug on sources(slug);
create index if not exists idx_sources_type on sources(type);
create index if not exists idx_courses_source_id on courses(source_id);
create index if not exists idx_courses_status on courses(status);
create index if not exists idx_courses_difficulty on courses(difficulty);
create index if not exists idx_chapters_course_id on chapters(course_id);
create index if not exists idx_user_progress_user_id on user_progress(user_id);
create index if not exists idx_user_progress_course_id on user_progress(course_id);
create index if not exists idx_concepts_domain on concepts(domain);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_usage_quotas_user_period on usage_quotas(user_id, period);
