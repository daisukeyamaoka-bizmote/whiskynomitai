-- ツギノム（ブックマーク）機能
-- タイムラインの投稿をブックマークして「次に飲みたい」リストに追加

create table public.user_bookmarks (
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

create policy "bookmarks_select_own" on public.user_bookmarks
  for select using (auth.uid() = user_id);

create policy "bookmarks_insert_own" on public.user_bookmarks
  for insert with check (auth.uid() = user_id);

create policy "bookmarks_delete_own" on public.user_bookmarks
  for delete using (auth.uid() = user_id);

create index idx_bookmarks_user_id on public.user_bookmarks(user_id, created_at desc);

-- ノミタイ数カウント用カラム（既存のlikes_countをそのまま使う = ノミタイ）
-- likes_count は既にあるのでそのまま利用。名称だけフロントで変更。

-- プロフィールからdisplay_nameを取得するための関数
create or replace function public.get_user_display_name(p_user_id uuid)
returns text as $$
declare
  v_name text;
begin
  select
    coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', 'ウイスキーファン')
  into v_name
  from auth.users
  where id = p_user_id;
  return coalesce(v_name, 'ウイスキーファン');
end;
$$ language plpgsql security definer;
