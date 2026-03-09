-- 用户提交的 USDT 支付信息，供人工核对后开通订阅
create table if not exists usdt_payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  plan text not null,
  amount_usdt text,
  tx_hash text,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create index if not exists idx_usdt_payment_requests_user_id on usdt_payment_requests(user_id);
create index if not exists idx_usdt_payment_requests_status on usdt_payment_requests(status);
