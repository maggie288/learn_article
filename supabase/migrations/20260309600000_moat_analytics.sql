-- 护城河相关：用户学习行为日志 + Personal Knowledge Graph + 类比贡献（CURSOR.md）

-- 章节浏览（每次打开章节记录）
create table if not exists chapter_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  chapter_id uuid references chapters(id) not null,
  duration_seconds integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_chapter_views_user_id on chapter_views(user_id);
create index if not exists idx_chapter_views_chapter_id on chapter_views(chapter_id);
create index if not exists idx_chapter_views_created_at on chapter_views(created_at);

-- 测验作答（每道题一条，用于正确率与衰减）
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  course_id uuid references courses(id) not null,
  chapter_id uuid references chapters(id) not null,
  question_index integer not null,
  selected_answer text,
  correct boolean not null,
  time_spent_seconds integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_quiz_attempts_user_id on quiz_attempts(user_id);
create index if not exists idx_quiz_attempts_chapter_id on quiz_attempts(chapter_id);

-- 内容交互（类比/公式/代码/SVG/音频的 viewed|expanded|replayed 等）
create table if not exists content_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  chapter_id uuid references chapters(id) not null,
  element_type text not null check (element_type in ('analogy','formula','code','svg','audio')),
  action text not null check (action in ('viewed','expanded','collapsed','replayed','skipped')),
  created_at timestamptz default now()
);
create index if not exists idx_content_interactions_user_chapter on content_interactions(user_id, chapter_id);

-- 难度切换
create table if not exists difficulty_switches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  course_id uuid references courses(id) not null,
  from_level text not null,
  to_level text not null,
  created_at timestamptz default now()
);
create index if not exists idx_difficulty_switches_user_id on difficulty_switches(user_id);

-- 课程分享
create table if not exists course_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  course_id uuid references courses(id) not null,
  platform text not null,
  created_at timestamptz default now()
);
create index if not exists idx_course_shares_course_id on course_shares(course_id);

-- Personal Knowledge Graph：用户对概念的掌握度（0.0–1.0，基于测验+衰减）
create table if not exists user_concepts (
  user_id uuid references users(id) not null,
  concept_id uuid references concepts(id) not null,
  mastery_level float not null default 0 check (mastery_level >= 0 and mastery_level <= 1),
  last_reviewed timestamptz default now(),
  review_count integer default 0,
  primary key (user_id, concept_id)
);
create index if not exists idx_user_concepts_user_id on user_concepts(user_id);

-- 用户提交的类比（后续可做 UGC 与评分）
create table if not exists user_analogies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  concept_id uuid references concepts(id) not null,
  analogy_text text not null,
  submitted_at timestamptz default now()
);
create index if not exists idx_user_analogies_concept_id on user_analogies(concept_id);

create table if not exists analogy_scores (
  id uuid primary key default gen_random_uuid(),
  analogy_id uuid references user_analogies(id) not null,
  exam_sim_score float,
  user_quiz_score float,
  usage_count integer default 0,
  created_at timestamptz default now(),
  unique(analogy_id)
);
