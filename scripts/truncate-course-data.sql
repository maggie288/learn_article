-- 彻底清空「论文 + 课程」相关数据（生产环境慎用，数据不可恢复）
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 从 sources 开始 CASCADE，会级联清空：sources → courses → chapters 及所有引用 course/chapter 的表
truncate table sources restart identity cascade;
