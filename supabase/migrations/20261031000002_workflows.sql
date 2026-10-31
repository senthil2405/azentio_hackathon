-- azentio.ai portal: governed write paths.
-- Every function: SECURITY DEFINER, empty search_path, re-checks the caller's permission,
-- enforces allowed transitions, and writes audit (+ notification/outbox) in the same transaction.

-- ───────────────────────── fixes to 0001 ─────────────────────────
drop policy orgs_read on public.organisations;
create policy orgs_read on public.organisations for select to authenticated using (
  exists (select 1 from public.memberships m
          where m.org_id = organisations.id and m.user_id = (select auth.uid()) and m.status = 'active')
  or (select private.has_grant('portal_admin'))
);

-- Internal idea fields (problem, priority, owner) are employee-only; clients use idea_status_public.
drop policy ideas_read on public.improvement_ideas;
create policy ideas_read on public.improvement_ideas for select to authenticated using ((select private.is_employee()));
drop policy idea_changes_read on public.idea_status_changes;
create policy idea_changes_read on public.idea_status_changes for select to authenticated using ((select private.is_employee()));

create view public.idea_status_public with (security_barrier = true) as
  select i.id, i.title, i.offering, i.owner_team, i.status, i.public_update, i.theme_id, i.updated_at
  from public.improvement_ideas i
  where private.is_community_reader();
grant select on public.idea_status_public to authenticated;

-- ───────────────────────── small helpers ─────────────────────────
create or replace function private.require(cond boolean, code text)
returns void language plpgsql immutable as $$
begin
  if not coalesce(cond, false) then
    raise exception using errcode = 'P0001', message = code;
  end if;
end $$;

create or replace function private.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_key text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link);
  -- Outbox row for P1 email delivery; idempotency key prevents duplicates on retry.
  insert into private.outbox (idempotency_key, channel, recipient_id, payload)
  values (p_key, 'email', p_user, jsonb_build_object('kind', p_kind, 'title', p_title, 'body', p_body, 'link', p_link))
  on conflict (idempotency_key) do nothing;
$$;

-- Fixed-window rate limiter. Returns true when the hit is allowed.
create or replace function public.rate_limit_hit(p_bucket text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
        n int;
begin
  insert into private.rate_limits (bucket, window_start, hits) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  return n <= p_max;
end $$;
revoke execute on function public.rate_limit_hit from public, anon, authenticated;  -- server (service role) only

-- ───────────────────────── workspace & membership ─────────────────────────
create or replace function public.set_active_org(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare sid uuid := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
begin
  perform private.require(sid is not null, 'no_session');
  perform private.require(exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and org_id = p_org and status = 'active'), 'not_found');
  insert into public.active_workspaces (user_id, session_id, org_id) values ((select auth.uid()), sid, p_org)
  on conflict (user_id, session_id) do update set org_id = excluded.org_id, updated_at = now();
end $$;

create or replace function public.accept_terms()
returns void language sql security definer set search_path = '' as $$
  insert into public.profiles (user_id, terms_accepted_at) values ((select auth.uid()), now())
  on conflict (user_id) do update set terms_accepted_at = coalesce(public.profiles.terms_accepted_at, now());
$$;

-- Client admin invites into their *active* org only, and only client roles.
create or replace function public.create_invitation(p_email text, p_role public.client_role)
returns text language plpgsql security definer set search_path = '' as $$
declare org uuid := private.active_org();
        token text := encode(extensions.gen_random_bytes(32), 'hex');
        ttl int := private.config_int('invitation_ttl_hours');
        inv uuid;
begin
  perform private.require(org is not null, 'no_active_workspace');
  perform private.require(exists (select 1 from public.memberships where user_id = (select auth.uid())
    and org_id = org and client_role = 'client_admin' and status = 'active'), 'forbidden');
  perform private.require(char_length(btrim(p_email)) between 6 and 254 and p_email like '%_@_%._%', 'invalid_email');
  insert into public.invitations (org_id, email_norm, client_role, token_hash, expires_at, invited_by)
  values (org, lower(btrim(p_email)), p_role, encode(extensions.digest(token, 'sha256'), 'hex'),
          now() + make_interval(hours => ttl), (select auth.uid()))
  returning id into inv;
  perform private.audit('invitation.create', 'invitation', inv::text, org, jsonb_build_object('role', p_role));
  return token;  -- returned once; only the hash is stored
end $$;

-- Portal admin can invite into any client org (onboarding the first client admin).
create or replace function public.admin_create_invitation(p_org uuid, p_email text, p_role public.client_role)
returns text language plpgsql security definer set search_path = '' as $$
declare token text := encode(extensions.gen_random_bytes(32), 'hex'); inv uuid;
begin
  perform private.require(private.has_grant('portal_admin'), 'forbidden');
  perform private.require(exists (select 1 from public.organisations where id = p_org and kind = 'client'), 'not_found');
  insert into public.invitations (org_id, email_norm, client_role, token_hash, expires_at, invited_by)
  values (p_org, lower(btrim(p_email)), p_role, encode(extensions.digest(token, 'sha256'), 'hex'),
          now() + make_interval(hours => private.config_int('invitation_ttl_hours')), (select auth.uid()))
  returning id into inv;
  perform private.audit('invitation.admin_create', 'invitation', inv::text, p_org, jsonb_build_object('role', p_role));
  return token;
end $$;

create or replace function public.revoke_invitation(p_invitation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid := private.active_org();
begin
  perform private.require(exists (select 1 from public.memberships where user_id = (select auth.uid())
    and org_id = org and client_role = 'client_admin' and status = 'active'), 'forbidden');
  update public.invitations set revoked_at = now()
   where id = p_invitation and org_id = org and used_at is null and revoked_at is null;
  perform private.require(found, 'not_found');
  perform private.audit('invitation.revoke', 'invitation', p_invitation::text, org);
end $$;

-- Accept: token must be valid, unused, unexpired, and bound to the caller's *verified* email.
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; u_email text; u_confirmed timestamptz;
begin
  select * into inv from public.invitations where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if inv.id is null or inv.used_at is not null or inv.revoked_at is not null or inv.expires_at < now() then
    perform private.audit('invitation.reject', 'invitation', inv.id::text, inv.org_id, jsonb_build_object('reason', 'invalid_or_expired'));
    raise exception using errcode = 'P0001', message = 'invitation_invalid';
  end if;
  select lower(email), email_confirmed_at into u_email, u_confirmed from auth.users where id = (select auth.uid());
  if u_confirmed is null or u_email <> inv.email_norm then
    perform private.audit('invitation.reject', 'invitation', inv.id::text, inv.org_id, jsonb_build_object('reason', 'email_mismatch'));
    raise exception using errcode = 'P0001', message = 'invitation_wrong_account';
  end if;
  insert into public.memberships (user_id, org_id, client_role, approved_by)
  values ((select auth.uid()), inv.org_id, inv.client_role, inv.invited_by)
  on conflict (user_id, org_id) do update set status = 'active', client_role = excluded.client_role;
  update public.invitations set used_at = now() where id = inv.id;
  insert into public.profiles (user_id) values ((select auth.uid())) on conflict do nothing;
  perform private.audit('invitation.accept', 'invitation', inv.id::text, inv.org_id);
  return inv.org_id;
end $$;

-- Client admin changes roles/revokes within their active org. Cannot touch platform grants.
create or replace function public.set_member_role(p_user uuid, p_role public.client_role, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid := private.active_org();
begin
  perform private.require(exists (select 1 from public.memberships where user_id = (select auth.uid())
    and org_id = org and client_role = 'client_admin' and status = 'active'), 'forbidden');
  perform private.require(p_user <> (select auth.uid()), 'cannot_change_self');
  update public.memberships set client_role = p_role, status = case when p_active then 'active' else 'revoked' end
   where user_id = p_user and org_id = org;
  perform private.require(found, 'not_found');
  perform private.audit('membership.update', 'membership', p_user::text, org, jsonb_build_object('role', p_role, 'active', p_active));
end $$;

-- ───────────────────────── contribution state machine ─────────────────────────
-- Single source of truth for allowed transitions (mirrored + tested in src/server/learning/state-machine.ts).
create table private.contribution_transitions (
  from_state public.contribution_state not null,
  action text not null,
  to_state public.contribution_state not null,
  actor text not null check (actor in ('author', 'moderator')),
  primary key (from_state, action)
);
insert into private.contribution_transitions values
  ('draft',        'share_org',             'org_shared',   'author'),
  ('draft',        'submit',                'submitted',    'author'),
  ('org_shared',   'submit',                'submitted',    'author'),
  ('returned',     'resubmit',              'submitted',    'author'),
  ('published',    'edit',                  'published',    'author'),   -- new version enters review; copy stays
  ('submitted',    'request_clarification', 'returned',     'moderator'),
  ('submitted',    'reject',                'rejected',     'moderator'),
  ('submitted',    'publish',               'published',    'moderator'),
  ('published',    'unpublish',             'under_review', 'moderator'),
  ('under_review', 'republish',             'published',    'moderator'),
  ('under_review', 'remove',                'removed',      'moderator'),
  ('org_shared',   'withdraw',              'withdrawn',    'author'),
  ('submitted',    'withdraw',              'withdrawn',    'author'),
  ('returned',     'withdraw',              'withdrawn',    'author'),
  ('published',    'withdraw',              'withdrawn',    'author'),
  ('under_review', 'withdraw',              'withdrawn',    'author');

create or replace function private.next_state(p_from public.contribution_state, p_action text, p_actor text)
returns public.contribution_state language plpgsql stable security definer set search_path = '' as $$
declare s public.contribution_state;
begin
  select to_state into s from private.contribution_transitions where from_state = p_from and action = p_action and actor = p_actor;
  if s is null then raise exception using errcode = 'P0001', message = 'invalid_transition'; end if;
  return s;
end $$;

create or replace function private.flag_sensitive(p_text text)
returns jsonb language sql immutable as $$
  -- Heuristic only (accepted risk T-model): flags for moderator review, never a privacy guarantee.
  select coalesce(jsonb_agg(f), '[]'::jsonb) from (
    select 'possible_account_number' as f where p_text ~ '\m\d{8,18}\M'
    union all select 'possible_card_number' where p_text ~ '\m(?:\d[ -]?){13,19}\M'
    union all select 'possible_iban' where p_text ~* '\m[A-Z]{2}\d{2}[A-Z0-9]{10,30}\M'
    union all select 'email_address' where p_text ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    union all select 'phone_number' where p_text ~ '\+?\d[\d ()-]{8,}\d'
    union all select 'credential_like' where p_text ~* '(password|passwd|api[_ -]?key|secret|token)\s*[:=]'
  ) s;
$$;

create or replace function private.record_consents(p_contribution uuid, p_consents jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.consents (contribution_id, kind, granted, actor_id)
  select p_contribution, k::public.consent_kind, (p_consents ->> k)::boolean, (select auth.uid())
  from jsonb_object_keys(p_consents) k;
$$;

create or replace function private.consent(p_contribution uuid, p_kind public.consent_kind)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select granted from public.consents where contribution_id = p_contribution and kind = p_kind
                   order by at desc, id desc limit 1), false);
$$;

create or replace function private.insert_version(p_contribution uuid, f jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid; n int; txt text := coalesce(f ->> 'title', '') || ' ' || coalesce(f ->> 'body', '');
begin
  select coalesce(max(cv.n), 0) + 1 into n from public.contribution_versions cv where cv.contribution_id = p_contribution;
  insert into public.contribution_versions (contribution_id, n, type, offering, industry, region, period_start, period_end,
    evidence_type, confidence, title, body, links, sensitive_flags)
  values (p_contribution, n, (f ->> 'type')::public.contribution_type, btrim(f ->> 'offering'), btrim(f ->> 'industry'),
    btrim(f ->> 'region'), (f ->> 'period_start')::date, (f ->> 'period_end')::date,
    (f ->> 'evidence_type')::public.evidence_type, (f ->> 'confidence')::public.confidence,
    btrim(f ->> 'title'), btrim(f ->> 'body'),
    coalesce(array(select jsonb_array_elements_text(coalesce(f -> 'links', '[]'))), '{}'),
    private.flag_sensitive(txt))
  returning id into v;
  return v;
end $$;

-- Create a private draft. Saving never shares (constitution III).
create or replace function public.contribution_create(p_fields jsonb, p_consents jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare org uuid := private.active_org(); c uuid; v uuid;
begin
  perform private.require(org is not null, 'no_active_workspace');
  perform private.require(coalesce((p_consents ->> 'store_process')::boolean, false), 'consent_store_required');
  insert into public.contributions (author_id, org_id) values ((select auth.uid()), org) returning id into c;
  v := private.insert_version(c, p_fields);
  update public.contributions set current_version_id = v where id = c;
  perform private.record_consents(c, p_consents);
  perform private.audit('contribution.create', 'contribution', c::text, org);
  return c;
end $$;

create or replace function public.contribution_update_draft(p_contribution uuid, p_fields jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.contributions; v uuid;
begin
  select * into c from public.contributions where id = p_contribution for update;
  perform private.require(c.author_id = (select auth.uid()), 'not_found');
  perform private.require(c.state in ('draft', 'returned', 'org_shared'), 'invalid_transition');
  v := private.insert_version(c.id, p_fields);
  update public.contributions set current_version_id = v, updated_at = now() where id = c.id;
  perform private.audit('contribution.edit', 'contribution', c.id::text, c.org_id);
end $$;

-- Author actions: share_org | submit | resubmit | edit (published) | withdraw
create or replace function public.contribution_author_action(p_contribution uuid, p_action text, p_fields jsonb default null, p_consents jsonb default null)
returns public.contribution_state language plpgsql security definer set search_path = '' as $$
declare c public.contributions; to_s public.contribution_state; v uuid; sr uuid;
begin
  select * into c from public.contributions where id = p_contribution for update;
  perform private.require(c.author_id = (select auth.uid()), 'not_found');
  -- Authors act only within an org they still belong to.
  perform private.require(exists (select 1 from public.memberships where user_id = c.author_id and org_id = c.org_id and status = 'active'), 'not_found');
  to_s := private.next_state(c.state, p_action, 'author');
  if p_consents is not null then perform private.record_consents(c.id, p_consents); end if;

  if p_action in ('submit', 'resubmit') then
    perform private.require(private.consent(c.id, 'publish_shared'), 'consent_publish_required');
    if p_fields is not null then v := private.insert_version(c.id, p_fields); update public.contributions set current_version_id = v where id = c.id; end if;
    update public.contributions set visibility = 'propose_community', state = to_s, updated_at = now() where id = c.id;
  elsif p_action = 'share_org' then
    update public.contributions set visibility = 'org', state = to_s, updated_at = now() where id = c.id;
  elsif p_action = 'edit' then
    -- Material edit: new version goes to review; the approved shared copy stays as-is (never widened silently).
    perform private.require(p_fields is not null, 'fields_required');
    v := private.insert_version(c.id, p_fields);
    update public.contributions set current_version_id = v, updated_at = now() where id = c.id;
    insert into public.moderation_events (contribution_id, version_id, actor_id, from_state, to_state, public_reason)
    values (c.id, v, (select auth.uid()), c.state, 'submitted', 'Author submitted a revised version for review');
  elsif p_action = 'withdraw' then
    -- Synchronous invalidation: deleting the shared copy cascades to search (same row), theme and idea
    -- evidence links, and provenance. AIRA/search read only shared_representations, so nothing remains.
    select shared_rep_id into sr from private.shared_rep_provenance where contribution_id = c.id;
    if sr is not null then delete from public.shared_representations where id = sr; end if;
    perform private.record_consents(c.id, '{"publish_shared": false}'::jsonb);
    update public.contributions set state = to_s, published_version_id = null, updated_at = now() where id = c.id;
  end if;

  if p_action <> 'edit' then
    insert into public.moderation_events (contribution_id, version_id, actor_id, from_state, to_state)
    values (c.id, c.current_version_id, (select auth.uid()), c.state, to_s);
  end if;
  perform private.audit('contribution.' || p_action, 'contribution', c.id::text, c.org_id, jsonb_build_object('from', c.state, 'to', to_s));
  return to_s;
end $$;

-- Moderator actions. Moderators are employees only (owner decision D11).
-- p_shared (publish): reviewed fields {title, body, region_coarse, period_coarse, attribute: bool}
create or replace function public.contribution_moderate(p_contribution uuid, p_action text, p_public_reason text default null,
  p_private_note text default null, p_shared jsonb default null)
returns public.contribution_state language plpgsql security definer set search_path = '' as $$
declare c public.contributions; to_s public.contribution_state; v public.contribution_versions; sr uuid; org_name text;
begin
  perform private.require(private.has_grant('moderator') and private.is_employee(), 'forbidden');
  select * into c from public.contributions where id = p_contribution for update;
  perform private.require(c.id is not null and c.visibility = 'propose_community' and c.state <> 'draft', 'not_found');
  -- A pending revision of a published item is moderated via 'publish' on the published state.
  if c.state = 'published' and p_action = 'publish' then
    to_s := 'published';
  else
    to_s := private.next_state(c.state, p_action, 'moderator');
  end if;
  select * into v from public.contribution_versions where id = c.current_version_id;

  if p_action in ('publish', 'republish') and p_action = 'publish' then
    perform private.require(p_shared is not null, 'reviewed_fields_required');
    perform private.require(private.consent(c.id, 'publish_shared'), 'consent_publish_required');
    if coalesce((p_shared ->> 'attribute')::boolean, false) then
      perform private.require(private.consent(c.id, 'attribution'), 'consent_attribution_required');
      select name into org_name from public.organisations where id = c.org_id;
    end if;
    select shared_rep_id into sr from private.shared_rep_provenance where contribution_id = c.id;
    if sr is not null then delete from public.shared_representations where id = sr; end if;  -- replace prior copy
    insert into public.shared_representations (title, body, type, offering, industry, region_coarse, period_coarse,
      period_start, evidence_type, confidence, attribution_org_name)
    values (btrim(p_shared ->> 'title'), btrim(p_shared ->> 'body'), v.type, v.offering, v.industry,
      btrim(p_shared ->> 'region_coarse'), btrim(p_shared ->> 'period_coarse'), date_trunc('quarter', v.period_start)::date,
      v.evidence_type, v.confidence, org_name)
    returning id into sr;
    insert into private.shared_rep_provenance (shared_rep_id, contribution_id, org_id) values (sr, c.id, c.org_id);
    update public.contributions set published_version_id = v.id where id = c.id;
  elsif p_action = 'unpublish' then
    update public.shared_representations s set status = 'unpublished'
      from private.shared_rep_provenance p where p.shared_rep_id = s.id and p.contribution_id = c.id;
  elsif p_action = 'republish' then
    update public.shared_representations s set status = 'published'
      from private.shared_rep_provenance p where p.shared_rep_id = s.id and p.contribution_id = c.id;
  elsif p_action = 'remove' then
    delete from public.shared_representations s using private.shared_rep_provenance p
      where p.shared_rep_id = s.id and p.contribution_id = c.id;
  elsif p_action in ('request_clarification', 'reject') then
    perform private.require(char_length(coalesce(p_public_reason, '')) >= 5, 'reason_required');
  end if;

  update public.contributions set state = to_s, updated_at = now() where id = c.id;
  insert into public.moderation_events (contribution_id, version_id, actor_id, from_state, to_state, public_reason, reviewer_note_private)
  values (c.id, v.id, (select auth.uid()), c.state, to_s, p_public_reason, p_private_note);
  perform private.notify(c.author_id, 'contribution.' || p_action, 'Your contribution: ' || replace(p_action, '_', ' '),
    coalesce(p_public_reason, ''), '/portal/contributions/' || c.id, 'contribution:' || c.id || ':' || p_action || ':' || v.id);
  perform private.audit('moderation.' || p_action, 'contribution', c.id::text, c.org_id, jsonb_build_object('from', c.state, 'to', to_s));
  return to_s;
end $$;

-- ───────────────────────── reports ─────────────────────────
create or replace function public.report_create(p_shared_rep uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r uuid;
begin
  perform private.require(private.is_community_reader(), 'forbidden');
  perform private.require(exists (select 1 from public.shared_representations where id = p_shared_rep and status = 'published'), 'not_found');
  insert into public.reports (shared_rep_id, reporter_id, reason) values (p_shared_rep, (select auth.uid()), btrim(p_reason)) returning id into r;
  perform private.audit('report.create', 'report', r::text, null);
  return r;
end $$;

-- Moderator resolves a report; contributor is informed without disclosing the reporter.
create or replace function public.report_resolve(p_report uuid, p_uphold boolean, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare rep public.reports; c uuid; author uuid;
begin
  perform private.require(private.has_grant('moderator') and private.is_employee(), 'forbidden');
  select * into rep from public.reports where id = p_report and state = 'open' for update;
  perform private.require(rep.id is not null, 'not_found');
  update public.reports set state = case when p_uphold then 'upheld'::public.report_state else 'dismissed'::public.report_state end,
    decision_note = p_note where id = rep.id;
  select p.contribution_id, ct.author_id into c, author from private.shared_rep_provenance p
    join public.contributions ct on ct.id = p.contribution_id where p.shared_rep_id = rep.shared_rep_id;
  if author is not null then
    perform private.notify(author, 'report.resolved', 'A report about your shared contribution was reviewed',
      case when p_uphold then 'The moderator upheld the report. ' else 'The moderator dismissed the report. ' end || coalesce(p_note, ''),
      '/portal/contributions/' || c, 'report:' || rep.id || ':resolved');
  end if;
  perform private.audit('report.resolve', 'report', rep.id::text, null, jsonb_build_object('upheld', p_uphold));
end $$;

-- ───────────────────────── themes & aggregation safeguards ─────────────────────────
create or replace function public.theme_save(p_theme uuid, p_title text, p_summary text, p_limitations text, p_offering text, p_evidence uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare t uuid := p_theme;
begin
  perform private.require(private.is_employee() and (private.has_grant('moderator') or private.has_grant('product_owner')), 'forbidden');
  if t is null then
    insert into public.themes (title, summary, limitations, offering, created_by)
    values (btrim(p_title), coalesce(p_summary, ''), coalesce(p_limitations, ''), p_offering, (select auth.uid())) returning id into t;
  else
    update public.themes set title = btrim(p_title), summary = coalesce(p_summary, ''), limitations = coalesce(p_limitations, ''),
      offering = p_offering, updated_at = now() where id = t;
    perform private.require(found, 'not_found');
    delete from public.theme_evidence where theme_id = t;
  end if;
  insert into public.theme_evidence (theme_id, shared_rep_id)
    select t, s.id from public.shared_representations s where s.id = any(p_evidence) and s.status = 'published';
  perform private.audit('theme.save', 'theme', t::text, null, jsonb_build_object('evidence', cardinality(p_evidence)));
  return t;
end $$;

-- Distinct contributing organisations, suppressed (NULL) below the configured minimum cohort.
-- Repeated posts from one organisation count once (spec §10).
create or replace function public.theme_stats(p_theme uuid)
returns table (theme_id uuid, evidence_count int, distinct_orgs int, suppressed boolean, min_cohort int)
language sql stable security definer set search_path = '' as $$
  with ev as (
    select te.shared_rep_id, p.org_id from public.theme_evidence te
    join public.shared_representations s on s.id = te.shared_rep_id and s.status = 'published'
    join private.shared_rep_provenance p on p.shared_rep_id = te.shared_rep_id
    where te.theme_id = p_theme
  ), agg as (select count(*)::int n, count(distinct org_id)::int d from ev)
  select p_theme,
         case when agg.d >= private.config_int('min_cohort') then agg.n end,
         case when agg.d >= private.config_int('min_cohort') then agg.d end,
         agg.d < private.config_int('min_cohort'),
         private.config_int('min_cohort')
  from agg
  where private.is_community_reader();
$$;

-- ───────────────────────── improvement ideas ─────────────────────────
create or replace function public.idea_save(p_idea uuid, p jsonb, p_evidence uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare i uuid := p_idea;
begin
  perform private.require(private.has_grant('product_owner') and private.is_employee(), 'forbidden');
  if i is null then
    insert into public.improvement_ideas (title, problem, offering, proposed_outcome, owner_team, owner_id, priority, theme_id)
    values (btrim(p ->> 'title'), btrim(p ->> 'problem'), btrim(p ->> 'offering'), btrim(p ->> 'proposed_outcome'),
      btrim(p ->> 'owner_team'), (select auth.uid()), coalesce(p ->> 'priority', 'medium'), nullif(p ->> 'theme_id', '')::uuid)
    returning id into i;
    insert into public.idea_status_changes (idea_id, from_status, to_status, actor_id, public_note) values (i, null, 'proposed', (select auth.uid()), '');
  else
    update public.improvement_ideas set title = btrim(p ->> 'title'), problem = btrim(p ->> 'problem'), offering = btrim(p ->> 'offering'),
      proposed_outcome = btrim(p ->> 'proposed_outcome'), owner_team = btrim(p ->> 'owner_team'),
      priority = coalesce(p ->> 'priority', priority), theme_id = nullif(p ->> 'theme_id', '')::uuid, updated_at = now()
    where id = i;
    perform private.require(found, 'not_found');
    delete from public.idea_evidence where idea_id = i;
  end if;
  -- Only permitted (published, shared) evidence can be linked.
  insert into public.idea_evidence (idea_id, shared_rep_id)
    select i, s.id from public.shared_representations s where s.id = any(p_evidence) and s.status = 'published';
  perform private.audit('idea.save', 'idea', i::text, null);
  return i;
end $$;

create or replace function public.idea_set_status(p_idea uuid, p_status public.idea_status, p_public_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare old public.idea_status;
begin
  perform private.require(private.has_grant('product_owner') and private.is_employee(), 'forbidden');
  select status into old from public.improvement_ideas where id = p_idea for update;
  perform private.require(old is not null, 'not_found');
  update public.improvement_ideas set status = p_status, public_update = coalesce(p_public_note, ''), updated_at = now() where id = p_idea;
  insert into public.idea_status_changes (idea_id, from_status, to_status, actor_id, public_note)
  values (p_idea, old, p_status, (select auth.uid()), coalesce(p_public_note, ''));
  -- Close the loop with contributors whose evidence supports the idea (audience-appropriate text only).
  perform private.notify(ct.author_id, 'idea.status', 'An improvement linked to your contribution changed status',
      'Status: ' || replace(p_status::text, '_', ' ') || '. ' || coalesce(p_public_note, ''), '/portal/insights/ideas/' || p_idea,
      'idea:' || p_idea || ':' || p_status || ':' || ct.author_id)
    from public.idea_evidence ie
    join private.shared_rep_provenance pr on pr.shared_rep_id = ie.shared_rep_id
    join public.contributions ct on ct.id = pr.contribution_id
    where ie.idea_id = p_idea;
  perform private.audit('idea.status', 'idea', p_idea::text, null, jsonb_build_object('from', old, 'to', p_status));
end $$;

-- ───────────────────────── publisher & admin ─────────────────────────
create or replace function public.broadcast_save(p_id uuid, p_title text, p_description text, p_audience public.audience, p_starts timestamptz, p_media uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare b uuid := p_id;
begin
  perform private.require(private.has_grant('publisher') and private.is_employee(), 'forbidden');
  perform private.require(p_audience in ('employees', 'public', 'community'), 'invalid_audience');
  if b is null then
    insert into public.broadcasts (title, description, audience, starts_at, media_id, updated_by)
    values (p_title, coalesce(p_description, ''), p_audience, p_starts, p_media, (select auth.uid())) returning id into b;
  else
    update public.broadcasts set title = p_title, description = coalesce(p_description, ''), audience = p_audience,
      starts_at = p_starts, media_id = p_media, updated_by = (select auth.uid()) where id = b;
    perform private.require(found, 'not_found');
  end if;
  perform private.audit('broadcast.save', 'broadcast', b::text, null, jsonb_build_object('audience', p_audience));
  return b;
end $$;

-- Lock down: functions are callable only by signed-in users (or the server's service role).
do $$
declare f text;
begin
  foreach f in array array['set_active_org','accept_terms','create_invitation','admin_create_invitation','revoke_invitation',
    'accept_invitation','set_member_role','contribution_create','contribution_update_draft','contribution_author_action',
    'contribution_moderate','report_create','report_resolve','theme_save','theme_stats','idea_save','idea_set_status','broadcast_save'] loop
    execute format('revoke execute on function public.%I from public, anon', f);
    execute format('grant execute on function public.%I to authenticated', f);
  end loop;
end $$;
