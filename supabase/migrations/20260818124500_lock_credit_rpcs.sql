-- ClipMotion credits represent paid variable AI usage. Never allow a browser role
-- to mint or mutate balances through SECURITY DEFINER RPCs.
revoke execute on function public.add_credits(uuid, integer) from public;
revoke execute on function public.add_credits(uuid, integer) from anon;
revoke execute on function public.add_credits(uuid, integer) from authenticated;
grant execute on function public.add_credits(uuid, integer) to service_role;

revoke execute on function public.deduct_credits(uuid, integer) from public;
revoke execute on function public.deduct_credits(uuid, integer) from anon;
revoke execute on function public.deduct_credits(uuid, integer) from authenticated;
grant execute on function public.deduct_credits(uuid, integer) to service_role;
