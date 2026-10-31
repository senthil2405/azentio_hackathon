-- Fix: a column-level REVOKE is a no-op while a table-level SELECT grant exists.
-- Grant only the non-private columns; moderators read reviewer notes through a checked function.
revoke select on public.moderation_events from authenticated;
grant select (id, contribution_id, version_id, actor_id, from_state, to_state, public_reason, at)
  on public.moderation_events to authenticated;

create or replace function public.moderation_private_notes(p_contribution uuid)
returns table (id bigint, at timestamptz, to_state public.contribution_state, reviewer_note_private text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require(private.has_grant('moderator') and private.is_employee(), 'forbidden');
  return query select m.id, m.at, m.to_state, m.reviewer_note_private
    from public.moderation_events m where m.contribution_id = p_contribution order by m.at;
end $$;
revoke execute on function public.moderation_private_notes from public, anon;
grant execute on function public.moderation_private_notes to authenticated;
