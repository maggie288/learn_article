-- 允许删除 source 时级联删除其 courses 及所有依赖，避免违反外键
-- 解决: update or delete on table "sources" violates foreign key constraint "courses_source_id_fkey"
-- 在 Supabase Dashboard → SQL Editor 中执行本文件，或执行下方「最小版本」即可生效。

-- ========== 最小版本（仅初始 schema 必有表，先执行这个若报错再执行完整版）==========
-- 1. 删除 source 时自动删除其 courses
alter table courses
  drop constraint if exists courses_source_id_fkey,
  add constraint courses_source_id_fkey
    foreign key (source_id) references sources(id) on delete cascade;

-- 2. 删除 course 时自动删除其 chapters
alter table chapters
  drop constraint if exists chapters_course_id_fkey,
  add constraint chapters_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

-- 3. 删除 course/chapter 时清理关联数据（初始 schema）
alter table user_progress
  drop constraint if exists user_progress_course_id_fkey,
  add constraint user_progress_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

alter table user_progress
  drop constraint if exists user_progress_chapter_id_fkey,
  add constraint user_progress_chapter_id_fkey
    foreign key (chapter_id) references chapters(id) on delete cascade;

alter table user_achievements
  drop constraint if exists user_achievements_course_id_fkey,
  add constraint user_achievements_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

alter table user_favorites
  drop constraint if exists user_favorites_course_id_fkey,
  add constraint user_favorites_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

alter table verification_logs
  drop constraint if exists verification_logs_course_id_fkey,
  add constraint verification_logs_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

-- 4. generation_tasks：删除 course 时仅置空 course_id
alter table generation_tasks
  drop constraint if exists generation_tasks_course_id_fkey,
  add constraint generation_tasks_course_id_fkey
    foreign key (course_id) references courses(id) on delete set null;

-- ========== 以下为护城河等后续迁移中的表（若表不存在会报错，可忽略或先跑完对应迁移再执行）==========
alter table chapter_views
  drop constraint if exists chapter_views_chapter_id_fkey,
  add constraint chapter_views_chapter_id_fkey
    foreign key (chapter_id) references chapters(id) on delete cascade;

alter table quiz_attempts
  drop constraint if exists quiz_attempts_chapter_id_fkey,
  add constraint quiz_attempts_chapter_id_fkey
    foreign key (chapter_id) references chapters(id) on delete cascade;

alter table quiz_attempts
  drop constraint if exists quiz_attempts_course_id_fkey,
  add constraint quiz_attempts_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

alter table content_interactions
  drop constraint if exists content_interactions_chapter_id_fkey,
  add constraint content_interactions_chapter_id_fkey
    foreign key (chapter_id) references chapters(id) on delete cascade;

alter table difficulty_switches
  drop constraint if exists difficulty_switches_course_id_fkey,
  add constraint difficulty_switches_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

alter table course_shares
  drop constraint if exists course_shares_course_id_fkey,
  add constraint course_shares_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;

alter table short_video_exports
  drop constraint if exists short_video_exports_course_id_fkey,
  add constraint short_video_exports_course_id_fkey
    foreign key (course_id) references courses(id) on delete cascade;
