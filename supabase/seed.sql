-- Synthetic seed data for local development and judging. ALL organisations, people and observations are fictional.
-- Personas sign in with email OTP (codes arrive in local Mailpit at http://localhost:54324).

-- ───────── organisations ─────────
insert into public.organisations (id, name, kind, industry, region) values
  ('00000000-0000-4000-a000-000000000001', 'Azentio', 'azentio', 'Software', 'Global'),
  ('00000000-0000-4000-a000-0000000000a1', 'Northbank Lending (synthetic)', 'client', 'SME lending', 'South Asia'),
  ('00000000-0000-4000-a000-0000000000b2', 'Meridian Commercial Bank (synthetic)', 'client', 'Commercial banking', 'Middle East'),
  ('00000000-0000-4000-a000-0000000000c3', 'Eastgate Finance (synthetic)', 'client', 'Non-bank finance', 'South-East Asia');

-- ───────── users (local only) ─────────
create temporary table seed_users (id uuid, email text) on commit drop;
insert into seed_users values
  ('10000000-0000-4000-b000-000000000001', 'alex.employee@azentio.com'),
  ('10000000-0000-4000-b000-000000000002', 'maya.moderator@azentio.com'),
  ('10000000-0000-4000-b000-000000000003', 'priya.owner@azentio.com'),
  ('10000000-0000-4000-b000-000000000004', 'paul.publisher@azentio.com'),
  ('10000000-0000-4000-b000-000000000005', 'ada.admin@azentio.com'),
  ('10000000-0000-4000-b000-000000000006', 'newhire@azentio.com'),          -- verified domain, NOT approved
  ('20000000-0000-4000-b000-0000000000a1', 'ana@northbank.example'),
  ('20000000-0000-4000-b000-0000000000a2', 'carl.admin@northbank.example'),
  ('20000000-0000-4000-b000-0000000000b1', 'bea@meridian.example'),
  ('20000000-0000-4000-b000-0000000000c1', 'cora@eastgate.example'),
  ('20000000-0000-4000-b000-0000000000d1', 'dev.consultant@advisory.example'), -- member of Northbank AND Meridian
  ('20000000-0000-4000-b000-0000000000e1', 'outsider@random.example');      -- no membership

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from seed_users;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email', jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from seed_users;

insert into public.profiles (user_id, display_name, terms_accepted_at)
select id, split_part(email, '@', 1), case when email like '%outsider%' then null else now() end from seed_users;

-- ───────── grants (separate, least privilege) ─────────
insert into public.role_grants (user_id, grant_kind) values
  ('10000000-0000-4000-b000-000000000001', 'employee'),
  ('10000000-0000-4000-b000-000000000002', 'employee'), ('10000000-0000-4000-b000-000000000002', 'moderator'),
  ('10000000-0000-4000-b000-000000000003', 'employee'), ('10000000-0000-4000-b000-000000000003', 'product_owner'),
  ('10000000-0000-4000-b000-000000000004', 'employee'), ('10000000-0000-4000-b000-000000000004', 'publisher'),
  ('10000000-0000-4000-b000-000000000005', 'employee'), ('10000000-0000-4000-b000-000000000005', 'portal_admin');

-- Employees are members of the Azentio org (for workspace context); clients of their own orgs.
insert into public.memberships (user_id, org_id, client_role) values
  ('10000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'member'),
  ('10000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', 'member'),
  ('10000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001', 'member'),
  ('10000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000001', 'member'),
  ('10000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000001', 'member'),
  ('20000000-0000-4000-b000-0000000000a1', '00000000-0000-4000-a000-0000000000a1', 'member'),
  ('20000000-0000-4000-b000-0000000000a2', '00000000-0000-4000-a000-0000000000a1', 'client_admin'),
  ('20000000-0000-4000-b000-0000000000b1', '00000000-0000-4000-a000-0000000000b2', 'member'),
  ('20000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-a000-0000000000c3', 'member'),
  ('20000000-0000-4000-b000-0000000000d1', '00000000-0000-4000-a000-0000000000a1', 'member'),
  ('20000000-0000-4000-b000-0000000000d1', '00000000-0000-4000-a000-0000000000b2', 'member');

-- ───────── products & entitlements ─────────
insert into public.products (id, slug, name) values
  ('30000000-0000-4000-c000-000000000001', 'credit-strategy-simulator', 'Credit Strategy Simulator'),
  ('30000000-0000-4000-c000-000000000002', 'sme-credit-decisioning', 'SME Credit Decisioning Workbench'),
  ('30000000-0000-4000-c000-000000000003', 'similar-portfolio-intelligence', 'Similar Portfolio Intelligence'),
  ('30000000-0000-4000-c000-000000000004', 'riva', 'RIVA'),
  ('30000000-0000-4000-c000-000000000005', 'financial-analysis-intelligence', 'Financial Analysis Intelligence');
insert into public.entitlements (org_id, product_id) values
  ('00000000-0000-4000-a000-0000000000a1', '30000000-0000-4000-c000-000000000002'),
  ('00000000-0000-4000-a000-0000000000a1', '30000000-0000-4000-c000-000000000005'),
  ('00000000-0000-4000-a000-0000000000b2', '30000000-0000-4000-c000-000000000001'),
  ('00000000-0000-4000-a000-0000000000c3', '30000000-0000-4000-c000-000000000003');
  -- Eastgate has no entitlement to the SME workbench (used by the sandbox 404 test).

-- ───────── content, media, broadcasts (audience-tagged) ─────────
insert into public.content_items (kind, audience, org_id, title, body, owner_id, review_date) values
  ('knowledge', 'employees', null, 'Internal: prototype notes for SME Workbench v0.4', 'Employee-only experiment notes. Must never appear in client or public search.', '10000000-0000-4000-b000-000000000003', current_date + 60),
  ('release_note', 'community', null, 'Release notes: Similar Portfolio Intelligence 2.1', 'Improved segment explanations and export controls.', '10000000-0000-4000-b000-000000000004', current_date + 90),
  ('briefing', 'org', '00000000-0000-4000-a000-0000000000a1', 'Northbank briefing: Q4 roadmap session', 'Invitation-only briefing for Northbank Lending.', '10000000-0000-4000-b000-000000000004', current_date + 30),
  ('experiment', 'employees', null, 'Experiment: retrieval-augmented covenant checks', 'Hackathon team space seed. Owner: Priya. Review in 30 days.', '10000000-0000-4000-b000-000000000003', current_date + 30);

insert into public.media_assets (id, title, storage_path, external_url, audience, org_id) values
  ('40000000-0000-4000-d000-000000000001', 'Internal all-hands recording (synthetic)', 'employee/all-hands-2026-10.mp4', null, 'employees', null),
  ('40000000-0000-4000-d000-000000000002', 'Northbank onboarding webinar (synthetic)', 'org/northbank/onboarding.mp4', null, 'org', '00000000-0000-4000-a000-0000000000a1');

insert into public.broadcasts (title, description, audience, starts_at, media_id, updated_by) values
  ('azentio.ai LIVE: AI Lab demo day', 'Internal broadcast for employees.', 'employees', now() + interval '3 days', '40000000-0000-4000-d000-000000000001', '10000000-0000-4000-b000-000000000004');

-- ───────── collective learning: the PDF's illustrative scenario (§10) ─────────
-- Three fictional organisations submit observations about seasonal SME cash flow. They start as submitted
-- (proposed to the community, consents recorded) so the moderator can run the demo end to end.
do $$
declare
  rec record; c uuid; v uuid;
begin
  for rec in select * from (values
    ('20000000-0000-4000-b000-0000000000a1'::uuid, '00000000-0000-4000-a000-0000000000a1'::uuid,
     'Seasonal SME cash flow is penalised in ratio comparisons',
     'Agricultural input suppliers show strong annual cash flow but two weak quarters. Standard quarter-on-quarter comparisons flag them as deteriorating when the pattern is normal for the season.',
     'Pune district', '2026-04-01'::date, '2026-09-30'::date),
    ('20000000-0000-4000-b000-0000000000b1'::uuid, '00000000-0000-4000-a000-0000000000b2'::uuid,
     'Retail SMEs flagged during pre-holiday inventory build',
     'Before the holiday season, retailers draw down working capital to build inventory. Our analysts override automated warnings for most of these files, which suggests the comparison lacks seasonality context.',
     'Dubai', '2026-07-01'::date, '2026-09-30'::date),
    ('20000000-0000-4000-b000-0000000000c1'::uuid, '00000000-0000-4000-a000-0000000000c3'::uuid,
     'Tourism businesses look riskier off-season than they are',
     'Hospitality SMEs show sharp revenue dips in monsoon months. Reviewers need a way to compare against the same season last year, not the previous quarter. Contact: ops lead 9876543210.',
     'Bali', '2026-01-01'::date, '2026-06-30'::date)
  ) as t(author, org, title, body, region, ps, pe)
  loop
    insert into public.contributions (author_id, org_id, visibility, state) values (rec.author, rec.org, 'propose_community', 'submitted') returning id into c;
    insert into public.contribution_versions (contribution_id, n, type, offering, industry, region, period_start, period_end, evidence_type, confidence, title, body, sensitive_flags)
    values (c, 1, 'product_gap', 'Financial Analysis Intelligence', 'SME lending', rec.region, rec.ps, rec.pe, 'customer_feedback', 'medium', rec.title, rec.body, private.flag_sensitive(rec.title || ' ' || rec.body))
    returning id into v;
    update public.contributions set current_version_id = v where id = c;
    insert into public.consents (contribution_id, kind, granted, actor_id) values
      (c, 'store_process', true, rec.author), (c, 'publish_shared', true, rec.author),
      (c, 'attribution', false, rec.author), (c, 'training', false, rec.author);
    insert into public.moderation_events (contribution_id, version_id, actor_id, from_state, to_state) values (c, v, rec.author, 'draft', 'submitted');
  end loop;
end $$;

-- A private draft and an org-only item for isolation tests.
do $$
declare c uuid; v uuid;
begin
  insert into public.contributions (author_id, org_id) values ('20000000-0000-4000-b000-0000000000a1', '00000000-0000-4000-a000-0000000000a1') returning id into c;
  insert into public.contribution_versions (contribution_id, n, type, offering, industry, region, period_start, period_end, evidence_type, confidence, title, body)
  values (c, 1, 'market_observation', 'SME Credit Decisioning Workbench', 'SME lending', 'Pune district', '2026-08-01', '2026-10-31', 'anecdotal', 'low',
          'PRIVATE DRAFT: competitor pricing rumour', 'Unverified note kept as a private draft. Must never be visible to anyone but the author.') returning id into v;
  update public.contributions set current_version_id = v where id = c;
  insert into public.consents (contribution_id, kind, granted, actor_id) values (c, 'store_process', true, '20000000-0000-4000-b000-0000000000a1');

  insert into public.contributions (author_id, org_id, visibility, state) values ('20000000-0000-4000-b000-0000000000a2', '00000000-0000-4000-a000-0000000000a1', 'org', 'org_shared') returning id into c;
  insert into public.contribution_versions (contribution_id, n, type, offering, industry, region, period_start, period_end, evidence_type, confidence, title, body)
  values (c, 1, 'operational_challenge', 'SME Credit Decisioning Workbench', 'SME lending', 'Maharashtra', '2026-07-01', '2026-09-30', 'internal_data', 'medium',
          'ORG ONLY: branch turnaround times rising', 'Shared within Northbank only. Must never be visible to other organisations or moderators.') returning id into v;
  update public.contributions set current_version_id = v where id = c;
  insert into public.consents (contribution_id, kind, granted, actor_id) values (c, 'store_process', true, '20000000-0000-4000-b000-0000000000a2');
end $$;
