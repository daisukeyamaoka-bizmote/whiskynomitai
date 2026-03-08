-- タイムライン投稿にウイスキー情報のスナップショットカラムを追加
-- これによりRLSの制約を回避してタイムラインを表示できる

alter table public.timeline_posts
  add column if not exists whiskey_name text,
  add column if not exists whiskey_distillery text,
  add column if not exists whiskey_region text,
  add column if not exists whiskey_type text,
  add column if not exists whiskey_rating integer,
  add column if not exists whiskey_photo_url text,
  add column if not exists whiskey_flavor_tags text[] default '{}',
  add column if not exists whiskey_note text;
