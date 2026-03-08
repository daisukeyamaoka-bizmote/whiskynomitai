-- ============================================
-- ai_usage_logs テーブル: AI利用回数の追跡
-- ============================================
create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null, -- 'analyze', 'research', 'suggest', 'dashboard'
  created_at timestamptz default now()
);

alter table public.ai_usage_logs enable row level security;

create policy "ai_usage_logs_select_own" on public.ai_usage_logs
  for select using (auth.uid() = user_id);

create policy "ai_usage_logs_insert_own" on public.ai_usage_logs
  for insert with check (auth.uid() = user_id);

create index idx_ai_usage_logs_user_month on public.ai_usage_logs(user_id, created_at);

-- ============================================
-- user_subscriptions テーブル: サブスクリプション管理
-- ============================================
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free', -- 'free', 'premium'
  status text not null default 'active', -- 'active', 'canceled', 'past_due'
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_subscriptions enable row level security;

create policy "user_subscriptions_select_own" on public.user_subscriptions
  for select using (auth.uid() = user_id);

create policy "user_subscriptions_insert_own" on public.user_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "user_subscriptions_update_own" on public.user_subscriptions
  for update using (auth.uid() = user_id);

create trigger set_updated_at_user_subscriptions
  before update on public.user_subscriptions
  for each row execute function public.handle_updated_at();
