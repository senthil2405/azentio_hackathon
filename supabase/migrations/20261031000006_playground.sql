-- Record a sandbox run: employees (internal) or members of an active client org entitled to the product.
create or replace function public.playground_record(p_product text, p_scenario text, p_inputs jsonb, p_outputs jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare prod uuid; org uuid := private.active_org(); is_client boolean; r uuid;
begin
  select id into prod from public.products where slug = p_product;
  perform private.require(prod is not null, 'not_found');
  select kind = 'client' into is_client from public.organisations where id = org;
  if coalesce(is_client, false) then
    perform private.require(exists (select 1 from public.entitlements where org_id = org and product_id = prod), 'not_found');
  else
    perform private.require(private.is_employee(), 'not_found');
    org := null;  -- internal run
  end if;
  insert into public.playground_runs (user_id, org_id, product_id, scenario, inputs, outputs)
  values ((select auth.uid()), org, prod, p_scenario, p_inputs, p_outputs) returning id into r;
  return r;
end $$;

create or replace function public.playground_feedback(p_run uuid, p_feedback jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.playground_runs set feedback = p_feedback where id = p_run and user_id = (select auth.uid());
  perform private.require(found, 'not_found');
end $$;
revoke execute on function public.playground_record, public.playground_feedback from public, anon;
grant execute on function public.playground_record, public.playground_feedback to authenticated;
