alter table users
add column if not exists clerk_user_id text unique;

create index if not exists idx_users_clerk_user_id on users(clerk_user_id);
