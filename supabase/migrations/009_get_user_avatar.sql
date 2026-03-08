-- RPC to fetch full user profile metadata from auth.users (security definer)
create or replace function public.get_user_avatar_url(p_user_id uuid)
returns text as $$
declare
  v_url text;
begin
  select raw_user_meta_data->>'avatar_url'
  into v_url from auth.users where id = p_user_id;
  return coalesce(v_url, '');
end;
$$ language plpgsql security definer;

-- Returns full profile metadata as JSON
create or replace function public.get_user_profile_meta(p_user_id uuid)
returns json as $$
declare
  v_meta jsonb;
begin
  select raw_user_meta_data into v_meta from auth.users where id = p_user_id;
  return json_build_object(
    'display_name', coalesce(v_meta->>'display_name', v_meta->>'full_name', 'ウイスキーファン'),
    'avatar_url', coalesce(v_meta->>'avatar_url', ''),
    'bio', coalesce(v_meta->>'bio', ''),
    'website', coalesce(v_meta->>'website', ''),
    'twitter', coalesce(v_meta->>'twitter', ''),
    'instagram', coalesce(v_meta->>'instagram', '')
  );
end;
$$ language plpgsql security definer;
