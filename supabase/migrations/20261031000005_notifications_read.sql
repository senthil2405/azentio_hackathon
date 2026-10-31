create or replace function public.notifications_mark_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = (select auth.uid()) and read_at is null;
$$;
revoke execute on function public.notifications_mark_read from public, anon;
grant execute on function public.notifications_mark_read to authenticated;
