drop policy if exists "notification_events_insert_board_editors" on public.notification_events;
create policy "notification_events_insert_board_editors"
on public.notification_events for insert
to authenticated
with check (
  user_id = auth.uid()
  or (
    board_id is not null
    and public.can_edit_board_content(board_id)
    and exists (
      select 1
      from public.board_members bm
      where bm.board_id = notification_events.board_id
        and bm.user_id = notification_events.user_id
    )
  )
);
