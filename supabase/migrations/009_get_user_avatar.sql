-- RPC to fetch avatar_url from auth.users (security definer to access auth schema)
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
