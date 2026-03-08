-- タイムライン投稿に飲んだ場所のスナップショットを追加
alter table public.timeline_posts
  add column if not exists whiskey_drinking_location text;

-- ユーザーの記録数を取得するRPC（レベル計算用）
create or replace function public.get_user_record_count(p_user_id uuid)
returns integer as $$
begin
  return (select count(*)::integer from public.tasting_records where user_id = p_user_id);
end;
$$ language plpgsql security definer;
