-- タイムライン機能: ウイ活投稿、いいね、コメント

-- ============================================
-- 1. timeline_posts テーブル (ウイ活)
-- ============================================
create table public.timeline_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.tasting_records(id) on delete cascade,
  comment text,
  is_public boolean default true,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamptz default now()
);

alter table public.timeline_posts enable row level security;

-- Everyone can read public posts
create policy "timeline_posts_select_public" on public.timeline_posts
  for select using (is_public = true or auth.uid() = user_id);

create policy "timeline_posts_insert_own" on public.timeline_posts
  for insert with check (auth.uid() = user_id);

create policy "timeline_posts_update_own" on public.timeline_posts
  for update using (auth.uid() = user_id);

create policy "timeline_posts_delete_own" on public.timeline_posts
  for delete using (auth.uid() = user_id);

create index idx_timeline_posts_created_at on public.timeline_posts(created_at desc);
create index idx_timeline_posts_user_id on public.timeline_posts(user_id);

-- ============================================
-- 2. timeline_likes テーブル
-- ============================================
create table public.timeline_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.timeline_posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.timeline_likes enable row level security;

create policy "timeline_likes_select_all" on public.timeline_likes
  for select using (true);

create policy "timeline_likes_insert_own" on public.timeline_likes
  for insert with check (auth.uid() = user_id);

create policy "timeline_likes_delete_own" on public.timeline_likes
  for delete using (auth.uid() = user_id);

-- ============================================
-- 3. timeline_comments テーブル
-- ============================================
create table public.timeline_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.timeline_posts(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.timeline_comments enable row level security;

create policy "timeline_comments_select_all" on public.timeline_comments
  for select using (true);

create policy "timeline_comments_insert_own" on public.timeline_comments
  for insert with check (auth.uid() = user_id);

create policy "timeline_comments_delete_own" on public.timeline_comments
  for delete using (auth.uid() = user_id);

-- ============================================
-- 4. user_follows テーブル (お気に入りユーザー)
-- ============================================
create table public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

alter table public.user_follows enable row level security;

create policy "user_follows_select_all" on public.user_follows
  for select using (true);

create policy "user_follows_insert_own" on public.user_follows
  for insert with check (auth.uid() = follower_id);

create policy "user_follows_delete_own" on public.user_follows
  for delete using (auth.uid() = follower_id);

-- ============================================
-- 5. いいね・コメント数の増減用RPC
-- ============================================
create or replace function public.increment_likes(p_post_id uuid)
returns void as $$
begin
  update public.timeline_posts
  set likes_count = likes_count + 1
  where id = p_post_id;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_likes(p_post_id uuid)
returns void as $$
begin
  update public.timeline_posts
  set likes_count = greatest(likes_count - 1, 0)
  where id = p_post_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_comments(p_post_id uuid)
returns void as $$
begin
  update public.timeline_posts
  set comments_count = comments_count + 1
  where id = p_post_id;
end;
$$ language plpgsql security definer;

-- tasting_records の select ポリシーを更新して公開投稿に紐づく記録は誰でも見れるようにする
create policy "tasting_records_select_public_posts" on public.tasting_records
  for select using (
    id in (select record_id from public.timeline_posts where is_public = true)
  );
