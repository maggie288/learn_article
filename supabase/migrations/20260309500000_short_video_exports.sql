-- 短视频导出任务与结果
create table if not exists short_video_exports (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  user_id uuid references users(id) not null,
  status text not null default 'queued',
  file_url text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_short_video_exports_course_id on short_video_exports(course_id);
create index if not exists idx_short_video_exports_user_id on short_video_exports(user_id);
create index if not exists idx_short_video_exports_status on short_video_exports(status);
