-- 生成任务逐章进度，供前端轮询展示
alter table generation_tasks
  add column if not exists progress_total_chapters integer,
  add column if not exists progress_chapters_done integer;

comment on column generation_tasks.progress_total_chapters is '总章节数（生成 outline 后设置）';
comment on column generation_tasks.progress_chapters_done is '已完成章节数（每章生成后 +1）';
