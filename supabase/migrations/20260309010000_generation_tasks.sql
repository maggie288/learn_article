create table if not exists generation_tasks (
  id uuid primary key,
  source_url text not null,
  difficulty text not null,
  language text not null default 'zh-CN',
  status text not null default 'queued',
  course_id uuid references courses(id),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_generation_tasks_status on generation_tasks(status);
create index if not exists idx_generation_tasks_course_id on generation_tasks(course_id);
