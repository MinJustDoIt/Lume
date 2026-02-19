-- Seed script for local/dev environments.
-- It uses the first available auth user as owner.

do $$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
  v_board_id uuid;
begin
  select id into v_owner_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_owner_id is null then
    raise exception 'No users found in auth.users. Create a user first, then rerun seed.';
  end if;

  insert into public.workspaces (name, created_by)
  values ('Lume Demo Workspace', v_owner_id)
  returning id into v_workspace_id;

  insert into public.boards (workspace_id, name, description, created_by)
  values (v_workspace_id, 'Product Roadmap', 'Demo board for initial setup', v_owner_id)
  returning id into v_board_id;

  -- Owner membership is auto-created by trigger, but this keeps seed idempotent if trigger changes.
  insert into public.board_members (board_id, user_id, role, added_by)
  values (v_board_id, v_owner_id, 'owner', v_owner_id)
  on conflict (board_id, user_id) do update set role = 'owner';

  insert into public.lists (board_id, name, position, created_by)
  values
    (v_board_id, 'Todo', 1000, v_owner_id),
    (v_board_id, 'In Progress', 2000, v_owner_id),
    (v_board_id, 'Done', 3000, v_owner_id);
end $$;
