-- Defence in depth for stored links (found by unit test: javascript: URLs must be rejected).
create or replace function private.all_http_urls(arr text[])
returns boolean language sql immutable as $$
  select coalesce(bool_and(u ~* '^https?://[^\s]+$'), true) from unnest(arr) u;
$$;
alter table public.contribution_versions add constraint contribution_links_http check (private.all_http_urls(links));
