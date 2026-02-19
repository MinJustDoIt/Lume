drop policy if exists "board_members_insert_owner_only" on public.board_members;
drop policy if exists "board_members_insert_owner_or_invitee" on public.board_members;
create policy "board_members_insert_owner_or_invitee"
on public.board_members for insert
to authenticated
with check (
  public.is_board_owner(board_id)
  or (
    user_id = auth.uid()
    and role in ('member', 'viewer')
    and exists (
      select 1
      from public.invitations i
      where i.board_id = board_members.board_id
        and lower(i.email) = public.current_user_email()
        and i.role = board_members.role
        and i.status = 'pending'
        and i.expires_at > now()
    )
  )
);

drop policy if exists "invitations_update_owner_only" on public.invitations;
drop policy if exists "invitations_update_owner_or_invitee" on public.invitations;
create policy "invitations_update_owner_or_invitee"
on public.invitations for update
to authenticated
using (
  public.is_board_owner(board_id)
  or (
    status = 'pending'
    and lower(email) = public.current_user_email()
  )
)
with check (
  public.is_board_owner(board_id)
  or (
    status = 'accepted'
    and accepted_by = auth.uid()
    and accepted_at is not null
    and lower(email) = public.current_user_email()
  )
);
