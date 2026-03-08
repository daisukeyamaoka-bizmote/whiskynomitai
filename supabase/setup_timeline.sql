-- =============================================
-- ウイスキーノミタイ: タイムライン・ソーシャル機能一括セットアップ
-- Supabase SQL Editor で実行してください
-- (006 + 007 + 008 マイグレーション統合)
-- =============================================

-- ============================================
-- 1. timeline_posts テーブル (ウイ活)
-- ============================================
create table if not exists public.timeline_posts (
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'timeline_posts' and policyname = 'timeline_posts_select_public') then
    create policy "timeline_posts_select_public" on public.timeline_posts for select using (is_public = true or auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'timeline_posts' and policyname = 'timeline_posts_insert_own') then
    create policy "timeline_posts_insert_own" on public.timeline_posts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'timeline_posts' and policyname = 'timeline_posts_update_own') then
    create policy "timeline_posts_update_own" on public.timeline_posts for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'timeline_posts' and policyname = 'timeline_posts_delete_own') then
    create policy "timeline_posts_delete_own" on public.timeline_posts for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_timeline_posts_created_at on public.timeline_posts(created_at desc);
create index if not exists idx_timeline_posts_user_id on public.timeline_posts(user_id);

-- ============================================
-- 2. timeline_likes テーブル
-- ============================================
create table if not exists public.timeline_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.timeline_posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.timeline_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'timeline_likes' and policyname = 'timeline_likes_select_all') then
    create policy "timeline_likes_select_all" on public.timeline_likes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'timeline_likes' and policyname = 'timeline_likes_insert_own') then
    create policy "timeline_likes_insert_own" on public.timeline_likes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'timeline_likes' and policyname = 'timeline_likes_delete_own') then
    create policy "timeline_likes_delete_own" on public.timeline_likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================
-- 3. timeline_comments テーブル
-- ============================================
create table if not exists public.timeline_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.timeline_posts(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.timeline_comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'timeline_comments' and policyname = 'timeline_comments_select_all') then
    create policy "timeline_comments_select_all" on public.timeline_comments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'timeline_comments' and policyname = 'timeline_comments_insert_own') then
    create policy "timeline_comments_insert_own" on public.timeline_comments for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'timeline_comments' and policyname = 'timeline_comments_delete_own') then
    create policy "timeline_comments_delete_own" on public.timeline_comments for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================
-- 4. user_follows テーブル
-- ============================================
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

alter table public.user_follows enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_follows' and policyname = 'user_follows_select_all') then
    create policy "user_follows_select_all" on public.user_follows for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_follows' and policyname = 'user_follows_insert_own') then
    create policy "user_follows_insert_own" on public.user_follows for insert with check (auth.uid() = follower_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_follows' and policyname = 'user_follows_delete_own') then
    create policy "user_follows_delete_own" on public.user_follows for delete using (auth.uid() = follower_id);
  end if;
end $$;

-- ============================================
-- 5. RPC関数（いいね・コメント数の増減）
-- ============================================
create or replace function public.increment_likes(p_post_id uuid)
returns void as $$
begin
  update public.timeline_posts set likes_count = likes_count + 1 where id = p_post_id;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_likes(p_post_id uuid)
returns void as $$
begin
  update public.timeline_posts set likes_count = greatest(likes_count - 1, 0) where id = p_post_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_comments(p_post_id uuid)
returns void as $$
begin
  update public.timeline_posts set comments_count = comments_count + 1 where id = p_post_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- 6. tasting_records 公開ポリシー追加
-- ============================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tasting_records' and policyname = 'tasting_records_select_public_posts') then
    create policy "tasting_records_select_public_posts" on public.tasting_records
      for select using (id in (select record_id from public.timeline_posts where is_public = true));
  end if;
end $$;

-- ============================================
-- 7. スナップショットカラム追加 (007)
-- ============================================
alter table public.timeline_posts
  add column if not exists whiskey_name text,
  add column if not exists whiskey_distillery text,
  add column if not exists whiskey_region text,
  add column if not exists whiskey_type text,
  add column if not exists whiskey_rating integer,
  add column if not exists whiskey_photo_url text,
  add column if not exists whiskey_flavor_tags text[] default '{}',
  add column if not exists whiskey_note text;

-- ============================================
-- 8. ブックマーク（ツギノム）テーブル (008)
-- ============================================
create table if not exists public.user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.timeline_posts(id) on delete cascade,
  whiskey_name text not null,
  whiskey_distillery text,
  whiskey_region text,
  whiskey_type text,
  whiskey_rating numeric,
  whiskey_photo_url text,
  whiskey_flavor_tags text[] default '{}',
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.user_bookmarks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_bookmarks' and policyname = 'bookmarks_select_own') then
    create policy "bookmarks_select_own" on public.user_bookmarks for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_bookmarks' and policyname = 'bookmarks_insert_own') then
    create policy "bookmarks_insert_own" on public.user_bookmarks for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_bookmarks' and policyname = 'bookmarks_delete_own') then
    create policy "bookmarks_delete_own" on public.user_bookmarks for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_bookmarks_user_id on public.user_bookmarks(user_id, created_at desc);

-- ============================================
-- 9. display_name取得用RPC
-- ============================================
create or replace function public.get_user_display_name(p_user_id uuid)
returns text as $$
declare
  v_name text;
begin
  select coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', 'ウイスキーファン')
  into v_name from auth.users where id = p_user_id;
  return coalesce(v_name, 'ウイスキーファン');
end;
$$ language plpgsql security definer;

-- ============================================
-- 完了！
-- ============================================
