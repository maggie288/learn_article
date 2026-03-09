-- USDT 支付开通订阅：subscriptions 支持 payment_request_id，stripe 改为可选
alter table subscriptions
  add column if not exists payment_request_id uuid references usdt_payment_requests(id);

alter table subscriptions
  alter column stripe_subscription_id drop not null;

-- 允许同一用户有多条订阅记录（历史），取最新 active 的一条
create index if not exists idx_subscriptions_payment_request_id on subscriptions(payment_request_id);
