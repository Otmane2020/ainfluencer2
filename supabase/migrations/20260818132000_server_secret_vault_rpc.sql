create or replace function public.get_server_secret(p_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
  order by created_at desc
  limit 1;
$$;

revoke execute on function public.get_server_secret(text) from public;
revoke execute on function public.get_server_secret(text) from anon;
revoke execute on function public.get_server_secret(text) from authenticated;
grant execute on function public.get_server_secret(text) to service_role;
