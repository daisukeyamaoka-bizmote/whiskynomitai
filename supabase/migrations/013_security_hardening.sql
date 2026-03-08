-- ============================================
-- セキュリティ強化マイグレーション
-- ============================================

-- ============================================
-- 1. tasting_records: 全認証ユーザーに全レコード公開 → 自分 + 公開投稿のみに制限
--    (migration 010 で過度に開放されたものを修正)
-- ============================================
drop policy if exists "tasting_records_select_authenticated" on public.tasting_records;

-- 自分のレコード or 公開タイムライン投稿に紐づくレコードのみ閲覧可能
create policy "tasting_records_select_own_and_public" on public.tasting_records
  for select using (
    auth.uid() = user_id
    or id in (select record_id from public.timeline_posts where is_public = true)
  );

-- ============================================
-- 2. user_subscriptions: クライアントからの INSERT を禁止
--    (サブスクはStripe webhook経由のservice roleのみ)
-- ============================================
drop policy if exists "user_subscriptions_insert_own" on public.user_subscriptions;

-- UPDATE も plan/status の直接変更を防ぐため、制限を強化
-- (stripe_customer_id 等のみ必要な場合は別途対応)
drop policy if exists "user_subscriptions_update_own" on public.user_subscriptions;

-- SELECT のみ残す（自分の subscription 確認用）

-- ============================================
-- 3. social tables: 未認証ユーザーのSELECTを禁止
-- ============================================

-- timeline_likes: true → 認証必須
drop policy if exists "timeline_likes_select_all" on public.timeline_likes;
create policy "timeline_likes_select_authenticated" on public.timeline_likes
  for select using (auth.role() = 'authenticated');

-- timeline_comments: true → 認証必須
drop policy if exists "timeline_comments_select_all" on public.timeline_comments;
create policy "timeline_comments_select_authenticated" on public.timeline_comments
  for select using (auth.role() = 'authenticated');

-- user_follows: true → 認証必須
drop policy if exists "user_follows_select_all" on public.user_follows;
create policy "user_follows_select_authenticated" on public.user_follows
  for select using (auth.role() = 'authenticated');

-- ============================================
-- 4. SECURITY DEFINER 関数: 認証チェック追加
-- ============================================

-- increment_likes: 認証必須 + 実際にいいねした人のみ
create or replace function public.increment_likes(p_post_id uuid)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  -- 実際に timeline_likes にレコードがある場合のみカウントアップ
  if not exists (
    select 1 from public.timeline_likes
    where post_id = p_post_id and user_id = auth.uid()
  ) then
    raise exception 'Like record not found';
  end if;
  update public.timeline_posts
  set likes_count = likes_count + 1
  where id = p_post_id;
end;
$$ language plpgsql security definer;

-- decrement_likes: 認証必須
create or replace function public.decrement_likes(p_post_id uuid)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  update public.timeline_posts
  set likes_count = greatest(likes_count - 1, 0)
  where id = p_post_id;
end;
$$ language plpgsql security definer;

-- increment_comments: 認証必須
create or replace function public.increment_comments(p_post_id uuid)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  update public.timeline_posts
  set comments_count = comments_count + 1
  where id = p_post_id;
end;
$$ language plpgsql security definer;

-- get_user_display_name: 認証必須
create or replace function public.get_user_display_name(p_user_id uuid)
returns text as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select coalesce(
    raw_user_meta_data->>'display_name',
    raw_user_meta_data->>'full_name',
    'ウイスキーファン'
  ) into v_name from auth.users where id = p_user_id;
  return coalesce(v_name, 'ウイスキーファン');
end;
$$ language plpgsql security definer;

-- get_user_avatar_url: 認証必須
create or replace function public.get_user_avatar_url(p_user_id uuid)
returns text as $$
declare
  v_url text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select raw_user_meta_data->>'avatar_url'
  into v_url from auth.users where id = p_user_id;
  return coalesce(v_url, '');
end;
$$ language plpgsql security definer;

-- get_user_profile_meta: 認証必須（website/twitter/instagram はユーザーが公開設定した情報）
create or replace function public.get_user_profile_meta(p_user_id uuid)
returns json as $$
declare
  v_meta jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select raw_user_meta_data into v_meta from auth.users where id = p_user_id;
  return json_build_object(
    'display_name', coalesce(v_meta->>'display_name', v_meta->>'full_name', 'ウイスキーファン'),
    'user_handle', coalesce(v_meta->>'user_handle', ''),
    'avatar_url', coalesce(v_meta->>'avatar_url', ''),
    'bio', coalesce(v_meta->>'bio', ''),
    'website', coalesce(v_meta->>'website', ''),
    'twitter', coalesce(v_meta->>'twitter', ''),
    'instagram', coalesce(v_meta->>'instagram', '')
  );
end;
$$ language plpgsql security definer;

-- search_users_by_handle: 認証必須 + 結果数制限
create or replace function public.search_users_by_handle(p_query text, p_limit integer default 10)
returns json as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  -- 最大20件に制限
  if p_limit > 20 then
    p_limit := 20;
  end if;
  return (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        id,
        coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', 'ウイスキーファン') as display_name,
        coalesce(raw_user_meta_data->>'user_handle', '') as user_handle,
        coalesce(raw_user_meta_data->>'avatar_url', '') as avatar_url
      from auth.users
      where
        raw_user_meta_data->>'user_handle' is not null
        and raw_user_meta_data->>'user_handle' != ''
        and lower(raw_user_meta_data->>'user_handle') like lower(p_query || '%')
      limit p_limit
    ) t
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- 5. get_user_profile_meta の未認証用バージョン (シェアページ用)
--    返すのは表示名のみ（bio, website, SNS等は含めない）
-- ============================================
create or replace function public.get_user_display_name_public(p_user_id uuid)
returns text as $$
declare
  v_name text;
begin
  select coalesce(
    raw_user_meta_data->>'display_name',
    raw_user_meta_data->>'full_name',
    'ウイスキーファン'
  ) into v_name from auth.users where id = p_user_id;
  return coalesce(v_name, 'ウイスキーファン');
end;
$$ language plpgsql security definer;

-- ============================================
-- 6. Storage: INSERT ポリシーにフォルダスコーピング追加
-- ============================================
drop policy if exists "whiskey_photos_insert" on storage.objects;

create policy "whiskey_photos_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'whiskey-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
