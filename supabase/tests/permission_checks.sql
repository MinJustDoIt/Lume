-- Permission validation checklist for Lume.
-- Run this after migration + seed in a non-production environment.
--
-- Notes:
-- 1) Supabase RLS is JWT-based. For true end-to-end RLS testing, execute mutations
--    from the app/client while signed in as each user role.
-- 2) These queries help prepare fixtures and expected outcomes.

-- ---------------------------------------------------------------------------
-- 0) Setup fixtures: create two extra users manually in Supabase Auth UI first.
--    Assume:
--      - owner_user: board owner
--      - member_user: member on board
--      - viewer_user: viewer on board
-- ---------------------------------------------------------------------------

-- Replace with real UUIDs from auth.users.
-- select id, email from auth.users order by created_at asc;

-- Example variables:
-- \set owner_id  '00000000-0000-0000-0000-000000000001'
-- \set member_id '00000000-0000-0000-0000-000000000002'
-- \set viewer_id '00000000-0000-0000-0000-000000000003'

-- ---------------------------------------------------------------------------
-- 1) Pick target board and ensure role assignments
-- ---------------------------------------------------------------------------

-- select b.id, b.name from public.boards b order by b.created_at desc limit 1;
-- \set board_id '...'

-- Ensure memberships (run as service role/admin):
-- insert into public.board_members (board_id, user_id, role, added_by)
-- values
--   (:'board_id', :'owner_id', 'owner', :'owner_id'),
--   (:'board_id', :'member_id', 'member', :'owner_id'),
--   (:'board_id', :'viewer_id', 'viewer', :'owner_id')
-- on conflict (board_id, user_id) do update set role = excluded.role;

-- ---------------------------------------------------------------------------
-- 2) Create two tasks for deletion tests (run as owner or service role)
-- ---------------------------------------------------------------------------

-- select id from public.lists where board_id = :'board_id' order by position limit 1;
-- \set list_id '...'

-- Task by member:
-- insert into public.tasks (board_id, list_id, title, created_by)
-- values (:'board_id', :'list_id', 'Member created task', :'member_id')
-- returning id;
-- \set task_member_created '...'

-- Task by owner:
-- insert into public.tasks (board_id, list_id, title, created_by)
-- values (:'board_id', :'list_id', 'Owner created task', :'owner_id')
-- returning id;
-- \set task_owner_created '...'

-- ---------------------------------------------------------------------------
-- 3) Expected RLS outcomes (execute from app as each user)
-- ---------------------------------------------------------------------------

-- [MEMBER] should PASS: delete own task
-- delete from public.tasks where id = :'task_member_created';

-- [MEMBER] should FAIL: delete owner task
-- delete from public.tasks where id = :'task_owner_created';

-- [VIEWER] should FAIL: create task
-- insert into public.tasks (board_id, list_id, title, created_by)
-- values (:'board_id', :'list_id', 'Viewer create attempt', :'viewer_id');

-- [VIEWER] should FAIL: create comment
-- insert into public.comments (board_id, task_id, author_id, content)
-- values (:'board_id', :'task_owner_created', :'viewer_id', 'Viewer comment attempt');

-- [OWNER] should PASS: delete any task
-- delete from public.tasks where id = :'task_owner_created';

-- ---------------------------------------------------------------------------
-- 4) Optional SQL pre-checks (logical expectation checks)
-- ---------------------------------------------------------------------------

-- Member can delete own task?
-- select (t.created_by = :'member_id') as member_can_delete_own
-- from public.tasks t
-- where t.id = :'task_member_created';

-- Member can delete owner task? (expect false unless member is owner)
-- select (t.created_by = :'member_id') as member_can_delete_owner_task
-- from public.tasks t
-- where t.id = :'task_owner_created';

-- Viewer can edit board content? expect false
-- select exists (
--   select 1
--   from public.board_members bm
--   where bm.board_id = :'board_id'
--     and bm.user_id = :'viewer_id'
--     and bm.role in ('owner', 'member')
-- ) as viewer_can_edit;
