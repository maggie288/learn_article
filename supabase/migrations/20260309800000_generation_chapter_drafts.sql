-- 章节生成中间结果：worker 跑完 narrator 后写入，主应用轮询读取（适配自建 worker）
create table if not exists generation_chapter_drafts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  chapter_index int not null,
  narrator_base jsonb not null,
  created_at timestamptz not null default now(),
  unique (course_id, chapter_index)
);

create index if not exists idx_generation_chapter_drafts_course_chapter
  on generation_chapter_drafts (course_id, chapter_index);

comment on table generation_chapter_drafts is 'Worker 生成 narrator 后写入，主应用 step 轮询后删除';
