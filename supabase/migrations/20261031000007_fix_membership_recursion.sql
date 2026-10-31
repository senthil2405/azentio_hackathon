-- Fix: memberships_read queried memberships inside its own policy → "infinite recursion detected".
-- Use SECURITY DEFINER helpers (bypass RLS internally, always scoped to auth.uid()).
create or replace function private.is_client_admin_of(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
                 where user_id = (select auth.uid()) and org_id = p_org and client_role = 'client_admin' and status = 'active');
$$;
create or replace function private.is_member_of(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
                 where user_id = (select auth.uid()) and org_id = p_org and status = 'active');
$$;
grant execute on function private.is_client_admin_of, private.is_member_of to authenticated;

drop policy memberships_read on public.memberships;
create policy memberships_read on public.memberships for select to authenticated using (
  user_id = (select auth.uid())
  or (org_id = (select private.active_org()) and (select private.is_client_admin_of(org_id)))
  or (select private.has_grant('portal_admin'))
);

drop policy orgs_read on public.organisations;
create policy orgs_read on public.organisations for select to authenticated using (
  (select private.is_member_of(id)) or (select private.has_grant('portal_admin'))
);

drop policy invitations_read on public.invitations;
create policy invitations_read on public.invitations for select to authenticated using (
  (org_id = (select private.active_org()) and (select private.is_client_admin_of(org_id)))
  or (select private.has_grant('portal_admin'))
);
