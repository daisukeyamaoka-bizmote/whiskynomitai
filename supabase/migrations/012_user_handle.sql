-- Update get_user_profile_meta to include user_handle
create or replace function public.get_user_profile_meta(p_user_id uuid)
returns json as $$
declare
  v_meta jsonb;
begin
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

-- Search users by handle for @mention
create or replace function public.search_users_by_handle(p_query text, p_limit integer default 10)
returns json as $$
begin
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
