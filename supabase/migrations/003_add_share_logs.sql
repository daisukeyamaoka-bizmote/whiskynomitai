-- ============================================
-- share_logs テーブル: シェア履歴の記録
-- ============================================
create table public.share_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.tasting_records(id) on delete cascade,
  platform text not null, -- 'x', 'line', 'native', 'download'
  created_at timestamptz default now()
);

-- RLS: Users can only access their own share logs
alter table public.share_logs enable row level security;

create policy "share_logs_select_own" on public.share_logs
  for select using (auth.uid() = user_id);

create policy "share_logs_insert_own" on public.share_logs
  for insert with check (auth.uid() = user_id);

-- Indexes
create index idx_share_logs_user_id on public.share_logs(user_id);
create index idx_share_logs_created_at on public.share_logs(created_at desc);
