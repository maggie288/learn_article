-- Email auth: password hash for self-hosted signup (nullable for existing users)
alter table users
add column if not exists password_hash text;
