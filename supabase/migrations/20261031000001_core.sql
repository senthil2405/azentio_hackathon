-- azentio.ai portal: core schema, access helpers and RLS.
-- Governing docs: .specify/memory/constitution.md, specs/001-portal-p0/plan.md, THREAT_MODEL.md
--
-- Conventions
--  * Every row a user can read carries an explicit, NOT NULL audience (constitution I).
--  * Reads go through RLS using the caller's JWT. Writes to governed data go through
--    SECURITY DEFINER functions (see 0002) that re-check permissions, enforce the state
--    machine and write audit + outbox rows in the same transaction.
--  * IDs exposed to clients are random UUIDs (unguessable; 404s do not leak existence).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ───────────────────────── enums ─────────────────────────
create type public.audience as enum ('public', 'employees', 'org', 'community', 'author');
create type public.grant_kind as enum ('employee', 'publisher', 'moderator', 'product_owner', 'portal_admin');
create type public.client_role as enum ('member', 'client_admin');
create type public.org_kind as enum ('client', 'azentio');
create type public.contribution_visibility as enum ('author_only', 'org', 'propose_community');
create type public.contribution_state as enum (
  'draft', 'org_shared', 'submitted', 'returned', 'rejected', 'published', 'under_review', 'removed', 'withdrawn'
);
create type public.contribution_type as enum (
  'market_observation', 'emerging_trend', 'product_gap', 'operational_challenge', 'successful_practice', 'improvement_suggestion'
);
create type public.evidence_type as enum ('anecdotal', 'internal_data', 'customer_feedback', 'market_research', 'regulatory_change');
create type public.confidence as enum ('low', 'medium', 'high');
create type public.consent_kind as enum ('store_process', 'publish_shared', 'attribution', 'training');
create type public.idea_status as enum ('proposed', 'under_review', 'planned', 'in_progress', 'released', 'not_proceeding');
create type public.report_state as enum ('open', 'upheld', 'dismissed');
create type public.outbox_state as enum ('queued', 'sent', 'failed');

-- ───────────────────────── identity & tenancy ─────────────────────────
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  kind public.org_kind not null default 'client',
  industry text,
  region text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  client_role public.client_role not null default 'member',
  status text not null default 'active' check (status in ('active', 'revoked')),
  approved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);
create index memberships_org_id_idx on public.memberships (org_id);

create table public.role_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_kind public.grant_kind not null,
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (user_id, grant_kind)
);

-- Explicit, time-boxed authorisation for a portal admin to access one client's private content (constitution II).
create table public.support_authorisations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 500),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index support_authorisations_admin_org_idx on public.support_authorisations (admin_id, org_id);

-- Active workspace is bound to the auth session (JWT session_id), never taken from the client.
create table public.active_workspaces (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  org_id uuid not null references public.organisations (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
create index active_workspaces_org_id_idx on public.active_workspaces (org_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email_norm text not null check (email_norm = lower(btrim(email_norm))),
  client_role public.client_role not null default 'member',
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index invitations_org_id_idx on public.invitations (org_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.entitlements (
  org_id uuid not null references public.organisations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  granted_by uuid references auth.users (id),
  primary key (org_id, product_id)
);
create index entitlements_product_id_idx on public.entitlements (product_id);

-- ───────────────────────── content & media ─────────────────────────
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('banner', 'insight', 'release_note', 'knowledge', 'briefing', 'experiment')),
  audience public.audience not null,
  org_id uuid references public.organisations (id) on delete cascade,
  title text not null check (char_length(title) <= 160),
  body text not null default '' check (char_length(body) <= 20000),
  owner_id uuid references auth.users (id),
  review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_org_audience check ((audience = 'org') = (org_id is not null))
);
create index content_items_audience_org_idx on public.content_items (audience, org_id);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text,             -- private bucket object (protected media)
  external_url text,             -- e.g. public YouTube showcase (audience must be public)
  audience public.audience not null,
  org_id uuid references public.organisations (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint media_org_audience check ((audience = 'org') = (org_id is not null)),
  constraint media_external_public check (external_url is null or audience = 'public'),
  constraint media_has_source check (storage_path is not null or external_url is not null)
);
create index media_assets_audience_org_idx on public.media_assets (audience, org_id);

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  audience public.audience not null,
  org_id uuid references public.organisations (id) on delete cascade,
  starts_at timestamptz not null,
  media_id uuid references public.media_assets (id) on delete set null,
  updated_by uuid references auth.users (id),
  constraint broadcast_org_audience check ((audience = 'org') = (org_id is not null))
);
create index broadcasts_media_id_idx on public.broadcasts (media_id);
create index broadcasts_audience_org_idx on public.broadcasts (audience, org_id);

-- ───────────────────────── collective learning (private write model) ─────────────────────────
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  visibility public.contribution_visibility not null default 'author_only',
  state public.contribution_state not null default 'draft',
  current_version_id uuid,
  published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contributions_author_idx on public.contributions (author_id);
create index contributions_org_state_idx on public.contributions (org_id, state);
create index contributions_state_vis_idx on public.contributions (state, visibility);

create table public.contribution_versions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  n int not null,
  type public.contribution_type not null,
  offering text not null check (char_length(offering) between 2 and 80),
  industry text not null check (char_length(industry) between 2 and 80),
  region text not null check (char_length(region) between 2 and 80),
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  evidence_type public.evidence_type not null,
  confidence public.confidence not null,
  title text not null check (char_length(title) between 5 and 120),
  body text not null check (char_length(body) between 20 and 4000),
  links text[] not null default '{}' check (cardinality(links) <= 5),
  sensitive_flags jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (contribution_id, n)
);
alter table public.contributions
  add constraint contributions_current_version_fk foreign key (current_version_id) references public.contribution_versions (id) deferrable initially deferred,
  add constraint contributions_published_version_fk foreign key (published_version_id) references public.contribution_versions (id) deferrable initially deferred;
create index contributions_current_version_idx on public.contributions (current_version_id);
create index contributions_published_version_idx on public.contributions (published_version_id);

create table public.consents (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  kind public.consent_kind not null,
  granted boolean not null,
  actor_id uuid not null references auth.users (id),
  at timestamptz not null default now()
);
create index consents_contribution_kind_idx on public.consents (contribution_id, kind, at desc);

create table public.moderation_events (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  version_id uuid references public.contribution_versions (id) on delete set null,
  actor_id uuid not null references auth.users (id),
  from_state public.contribution_state,
  to_state public.contribution_state not null,
  public_reason text check (char_length(public_reason) <= 1000),      -- shown to the author
  reviewer_note_private text check (char_length(reviewer_note_private) <= 2000), -- moderators only
  at timestamptz not null default now()
);
create index moderation_events_contribution_idx on public.moderation_events (contribution_id, at desc);
create index moderation_events_version_idx on public.moderation_events (version_id);

-- ───────────────────────── shared read model ─────────────────────────
-- Only moderator-reviewed fields. No author, no org, no attachments, no reviewer notes.
create table public.shared_representations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type public.contribution_type not null,
  offering text not null,
  industry text not null,
  region_coarse text not null,
  period_coarse text not null,          -- e.g. '2026-Q3'
  period_start date not null,
  evidence_type public.evidence_type not null,
  confidence public.confidence not null,
  attribution_org_name text,            -- only with attribution consent + review
  status text not null default 'published' check (status in ('published', 'unpublished')),
  published_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(offering, '') || ' ' || coalesce(industry, '')), 'C')
  ) stored,
  embedding extensions.vector(1024)
);
create index shared_reps_search_idx on public.shared_representations using gin (search);
create index shared_reps_filters_idx on public.shared_representations (status, offering, industry, region_coarse, period_start);

-- Provenance is needed for distinct-organisation counts and withdrawal, but never exposed.
create table private.shared_rep_provenance (
  shared_rep_id uuid primary key references public.shared_representations (id) on delete cascade,
  contribution_id uuid not null unique references public.contributions (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade
);
create index shared_rep_provenance_org_idx on private.shared_rep_provenance (org_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  shared_rep_id uuid not null references public.shared_representations (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 1000),
  state public.report_state not null default 'open',
  decision_note text,
  created_at timestamptz not null default now()
);
create index reports_shared_rep_idx on public.reports (shared_rep_id);
create index reports_reporter_idx on public.reports (reporter_id);

-- ───────────────────────── themes & improvement loop ─────────────────────────
create table public.themes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null default '' check (char_length(summary) <= 2000),
  limitations text not null default '' check (char_length(limitations) <= 1000),
  offering text,
  created_by uuid not null references auth.users (id),
  updated_at timestamptz not null default now()
);

create table public.theme_evidence (
  theme_id uuid not null references public.themes (id) on delete cascade,
  shared_rep_id uuid not null references public.shared_representations (id) on delete cascade,
  primary key (theme_id, shared_rep_id)
);
create index theme_evidence_shared_rep_idx on public.theme_evidence (shared_rep_id);

create table public.improvement_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 120),
  problem text not null check (char_length(problem) between 10 and 2000),
  offering text not null,
  proposed_outcome text not null check (char_length(proposed_outcome) between 10 and 2000),
  owner_team text not null,
  owner_id uuid not null references auth.users (id),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status public.idea_status not null default 'proposed',
  public_update text not null default '' check (char_length(public_update) <= 1000),
  theme_id uuid references public.themes (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index improvement_ideas_theme_idx on public.improvement_ideas (theme_id);
create index improvement_ideas_owner_idx on public.improvement_ideas (owner_id);

create table public.idea_evidence (
  idea_id uuid not null references public.improvement_ideas (id) on delete cascade,
  shared_rep_id uuid not null references public.shared_representations (id) on delete cascade,
  primary key (idea_id, shared_rep_id)
);
create index idea_evidence_shared_rep_idx on public.idea_evidence (shared_rep_id);

create table public.idea_status_changes (
  id bigint generated always as identity primary key,
  idea_id uuid not null references public.improvement_ideas (id) on delete cascade,
  from_status public.idea_status,
  to_status public.idea_status not null,
  actor_id uuid not null references auth.users (id),
  public_note text not null default '',
  at timestamptz not null default now()
);
create index idea_status_changes_idea_idx on public.idea_status_changes (idea_id, at desc);

-- ───────────────────────── notifications, outbox, audit, misc ─────────────────────────
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table private.outbox (
  id bigint generated always as identity primary key,
  idempotency_key text not null unique,
  channel text not null check (channel in ('email')),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  state public.outbox_state not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index outbox_queued_idx on private.outbox (created_at) where state = 'queued';
create index outbox_recipient_idx on private.outbox (recipient_id);

create table private.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text,
  org_id uuid,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create index audit_events_resource_idx on private.audit_events (resource_type, resource_id, at desc);

create table public.demo_requests (
  id bigint generated always as identity primary key,
  interest text not null check (char_length(interest) <= 80),
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) <= 254 and email like '%_@_%'),
  organisation text not null check (char_length(organisation) between 2 and 120),
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

create table public.hackathon_registrations (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) <= 254 and email like '%_@_%'),
  organisation text check (char_length(organisation) <= 120),
  team_size int check (team_size between 1 and 10),
  idea text not null default '' check (char_length(idea) <= 2000),
  created_at timestamptz not null default now()
);

create table public.playground_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,   -- null = employee internal run
  product_id uuid not null references public.products (id),
  scenario text not null,
  inputs jsonb not null,
  outputs jsonb not null,
  feedback jsonb,
  synthetic boolean not null default true check (synthetic),
  created_at timestamptz not null default now()
);
create index playground_runs_user_idx on public.playground_runs (user_id);
create index playground_runs_org_idx on public.playground_runs (org_id);
create index playground_runs_product_idx on public.playground_runs (product_id);

create table private.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);

create table private.app_config (
  key text primary key,
  value jsonb not null
);
insert into private.app_config (key, value) values
  ('min_cohort', '3'),                 -- approved: owner (judging); production value requires re-approval
  ('invitation_ttl_hours', '72'),      -- approved: owner
  ('signed_url_ttl_seconds', '300');   -- approved: owner

-- ───────────────────────── private helper functions ─────────────────────────
create or replace function private.has_grant(g public.grant_kind)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.role_grants rg where rg.user_id = (select auth.uid()) and rg.grant_kind = g);
$$;

-- Employee = approved employee grant AND verified azentio.com email (never the suffix alone).
create or replace function private.is_employee()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_grant('employee')
     and exists (
       select 1 from auth.users u
       where u.id = (select auth.uid())
         and u.email_confirmed_at is not null
         and lower(u.email) like '%@azentio.com'
     );
$$;

-- Active org for this auth session, only if the membership is still active.
create or replace function private.active_org()
returns uuid language sql stable security definer set search_path = '' as $$
  select aw.org_id
  from public.active_workspaces aw
  join public.memberships m on m.user_id = aw.user_id and m.org_id = aw.org_id and m.status = 'active'
  where aw.user_id = (select auth.uid())
    and aw.session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
$$;

create or replace function private.is_client_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m join public.organisations o on o.id = m.org_id
    where m.user_id = (select auth.uid()) and m.status = 'active' and o.kind = 'client'
  );
$$;

-- Shared learning community = active client members + employees.
create or replace function private.is_community_reader()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_employee() or private.is_client_member();
$$;

-- Generic audience check for content/media/broadcasts (deny by default).
create or replace function private.can_read(aud public.audience, row_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case aud
    when 'public' then true
    when 'employees' then private.is_employee()
    when 'org' then row_org is not null and row_org = private.active_org()
    when 'community' then private.is_community_reader()
    else false
  end;
$$;

create or replace function private.config_int(k text)
returns int language sql stable security definer set search_path = '' as $$
  select (value #>> '{}')::int from private.app_config where key = k;
$$;

create or replace function private.audit(p_action text, p_type text, p_id text, p_org uuid, p_detail jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into private.audit_events (actor_id, action, resource_type, resource_id, org_id, detail)
  values ((select auth.uid()), p_action, p_type, p_id, p_org, coalesce(p_detail, '{}'));
$$;

grant usage on schema private to authenticated;
grant execute on function private.has_grant, private.is_employee, private.active_org, private.is_client_member,
  private.is_community_reader, private.can_read to authenticated;

-- ───────────────────────── RLS ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'organisations','profiles','memberships','role_grants','support_authorisations','active_workspaces','invitations',
    'products','entitlements','content_items','media_assets','broadcasts','contributions','contribution_versions',
    'consents','moderation_events','shared_representations','reports','themes','theme_evidence','improvement_ideas',
    'idea_evidence','idea_status_changes','notifications','demo_requests','hackathon_registrations','playground_runs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;
alter table private.shared_rep_provenance enable row level security;
alter table private.outbox enable row level security;
alter table private.audit_events enable row level security;
alter table private.rate_limits enable row level security;
alter table private.app_config enable row level security;
-- (no policies on private tables: only SECURITY DEFINER functions touch them)

-- Default: authenticated/anon get SELECT only where a policy allows; all writes via functions.
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant select on public.products to anon;

create policy orgs_read on public.organisations for select to authenticated using (
  exists (select 1 from public.memberships m where m.org_id = id and m.user_id = (select auth.uid()) and m.status = 'active')
  or (select private.has_grant('portal_admin'))
);
create policy profiles_read_own on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy memberships_read on public.memberships for select to authenticated using (
  user_id = (select auth.uid())
  or (org_id = (select private.active_org()) and exists (
        select 1 from public.memberships me where me.user_id = (select auth.uid()) and me.org_id = memberships.org_id
          and me.client_role = 'client_admin' and me.status = 'active'))
  or (select private.has_grant('portal_admin'))
);
create policy grants_read_own on public.role_grants for select to authenticated using (
  user_id = (select auth.uid()) or (select private.has_grant('portal_admin'))
);
create policy support_auth_read on public.support_authorisations for select to authenticated using (
  admin_id = (select auth.uid()) or (select private.has_grant('portal_admin'))
);
create policy active_ws_read_own on public.active_workspaces for select to authenticated using (user_id = (select auth.uid()));
create policy invitations_read on public.invitations for select to authenticated using (
  org_id = (select private.active_org()) and exists (
    select 1 from public.memberships me where me.user_id = (select auth.uid()) and me.org_id = invitations.org_id
      and me.client_role = 'client_admin' and me.status = 'active')
  or (select private.has_grant('portal_admin'))
);
create policy products_read on public.products for select to anon, authenticated using (true);
create policy entitlements_read on public.entitlements for select to authenticated using (
  org_id = (select private.active_org()) or (select private.is_employee())
);
create policy content_read on public.content_items for select to authenticated using ((select private.can_read(audience, org_id)));
create policy media_read on public.media_assets for select to authenticated using ((select private.can_read(audience, org_id)));
create policy broadcasts_read on public.broadcasts for select to authenticated using ((select private.can_read(audience, org_id)));

-- Contributions: author; org members for org-shared items in the active org; moderators only for
-- items proposed to the community and past draft (never unsubmitted drafts or org-only items).
create policy contributions_read on public.contributions for select to authenticated using (
  author_id = (select auth.uid())
  or (visibility = 'org' and state = 'org_shared' and org_id = (select private.active_org()))
  or ((select private.has_grant('moderator')) and visibility = 'propose_community'
      and state in ('submitted', 'returned', 'rejected', 'published', 'under_review', 'removed'))
);
create policy versions_read on public.contribution_versions for select to authenticated using (
  exists (select 1 from public.contributions c where c.id = contribution_id)  -- inherits contributions_read
);
create policy consents_read on public.consents for select to authenticated using (
  exists (select 1 from public.contributions c where c.id = contribution_id and c.author_id = (select auth.uid()))
  or (select private.has_grant('moderator'))
);
create policy moderation_read on public.moderation_events for select to authenticated using (
  exists (select 1 from public.contributions c where c.id = contribution_id)
);
-- Reviewer private notes are hidden from non-moderators at the column level.
revoke select (reviewer_note_private) on public.moderation_events from authenticated;

create policy shared_reps_read on public.shared_representations for select to authenticated using (
  status = 'published' and (select private.is_community_reader())
  or (select private.has_grant('moderator'))
);
create policy reports_read on public.reports for select to authenticated using (
  reporter_id = (select auth.uid()) or (select private.has_grant('moderator'))
);
create policy themes_read on public.themes for select to authenticated using ((select private.is_community_reader()));
create policy theme_evidence_read on public.theme_evidence for select to authenticated using ((select private.is_community_reader()));
create policy ideas_read on public.improvement_ideas for select to authenticated using ((select private.is_community_reader()));
create policy idea_evidence_read on public.idea_evidence for select to authenticated using ((select private.is_community_reader()));
create policy idea_changes_read on public.idea_status_changes for select to authenticated using ((select private.is_community_reader()));
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy demo_requests_read on public.demo_requests for select to authenticated using ((select private.is_employee()));
create policy hackathon_read on public.hackathon_registrations for select to authenticated using ((select private.is_employee()));
create policy playground_runs_read on public.playground_runs for select to authenticated using (
  user_id = (select auth.uid())
  or (org_id is not null and org_id = (select private.active_org()))
);
