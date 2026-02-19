begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'board_member_role') then
    create type public.board_member_role as enum ('owner', 'member', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type public.notification_status as enum ('queued', 'sent', 'failed');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_boards_updated_at on public.boards;
create trigger trg_boards_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.board_member_role not null,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create or replace function public.add_board_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.board_members (board_id, user_id, role, added_by)
  values (new.id, new.created_by, 'owner', new.created_by)
  on conflict (board_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists trg_add_board_owner_membership on public.boards;
create trigger trg_add_board_owner_membership
after insert on public.boards
for each row execute function public.add_board_owner_membership();

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  position numeric(20,10) not null default 1000,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, board_id)
);

create index if not exists idx_lists_board_position on public.lists(board_id, position);

drop trigger if exists trg_lists_updated_at on public.lists;
create trigger trg_lists_updated_at
before update on public.lists
for each row execute function public.set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  list_id uuid not null,
  title text not null check (char_length(trim(title)) > 0),
  description text default '',
  status public.task_status not null default 'todo',
  position numeric(20,10) not null default 1000,
  due_date timestamptz,
  priority public.task_priority not null default 'medium',
  created_by uuid not null references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_tasks_list_board
    foreign key (list_id, board_id) references public.lists(id, board_id) on delete cascade
);

alter table public.tasks
add constraint tasks_id_board_id_unique unique (id, board_id);

create index if not exists idx_tasks_board_list_position on public.tasks(board_id, list_id, position);
create index if not exists idx_tasks_board_status on public.tasks(board_id, status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_task_completed_at on public.tasks;
create trigger trg_sync_task_completed_at
before update on public.tasks
for each row execute function public.sync_task_completed_at();

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null default '#94A3B8',
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(board_id, name)
);

create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(task_id, label_id)
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(task_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  task_id uuid not null,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete set null,
  content text not null check (char_length(trim(content)) > 0),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_comments_task_board
    foreign key (task_id, board_id) references public.tasks(id, board_id) on delete cascade
);

create index if not exists idx_comments_task_created_at on public.comments(task_id, created_at);

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create or replace function public.set_comment_edited_at()
returns trigger
language plpgsql
as $$
begin
  if new.content is distinct from old.content then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comments_edited_at on public.comments;
create trigger trg_comments_edited_at
before update on public.comments
for each row execute function public.set_comment_edited_at();

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(trim(emoji)) > 0),
  created_at timestamptz not null default now(),
  unique(comment_id, user_id, emoji)
);

create index if not exists idx_comment_reactions_comment on public.comment_reactions(comment_id);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  email text not null,
  role public.board_member_role not null check (role in ('member', 'viewer')),
  status public.invitation_status not null default 'pending',
  token text not null unique,
  invited_by uuid not null references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invitations_board_status on public.invitations(board_id, status);
create index if not exists idx_invitations_email on public.invitations(lower(email));

drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();

create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete set null,
  action_type text not null,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_activity_task_created_at on public.task_activity(task_id, created_at desc);
create index if not exists idx_task_activity_board_created_at on public.task_activity(board_id, created_at desc);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'queued',
  error_message text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_notification_events_user_status on public.notification_events(user_id, status, queued_at desc);

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_board_member(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_board_owner(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = auth.uid()
      and bm.role = 'owner'
  );
$$;

create or replace function public.can_edit_board_content(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'member')
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.lists enable row level security;
alter table public.tasks enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_assignees enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.invitations enable row level security;
alter table public.task_activity enable row level security;
alter table public.notification_events enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspaces_owner_all" on public.workspaces;
create policy "workspaces_owner_all"
on public.workspaces
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "boards_select_members" on public.boards;
create policy "boards_select_members"
on public.boards for select
to authenticated
using (public.is_board_member(id));

drop policy if exists "boards_insert_workspace_owner" on public.boards;
create policy "boards_insert_workspace_owner"
on public.boards for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id
      and w.created_by = auth.uid()
  )
);

drop policy if exists "boards_update_owner" on public.boards;
create policy "boards_update_owner"
on public.boards for update
to authenticated
using (public.is_board_owner(id))
with check (public.is_board_owner(id));

drop policy if exists "boards_delete_owner" on public.boards;
create policy "boards_delete_owner"
on public.boards for delete
to authenticated
using (public.is_board_owner(id));

drop policy if exists "board_members_select_board_members" on public.board_members;
create policy "board_members_select_board_members"
on public.board_members for select
to authenticated
using (public.is_board_member(board_id));

drop policy if exists "board_members_insert_owner_only" on public.board_members;
create policy "board_members_insert_owner_only"
on public.board_members for insert
to authenticated
with check (public.is_board_owner(board_id));

drop policy if exists "board_members_update_owner_only" on public.board_members;
create policy "board_members_update_owner_only"
on public.board_members for update
to authenticated
using (public.is_board_owner(board_id))
with check (public.is_board_owner(board_id));

drop policy if exists "board_members_delete_owner_or_self_leave" on public.board_members;
create policy "board_members_delete_owner_or_self_leave"
on public.board_members for delete
to authenticated
using (
  public.is_board_owner(board_id)
  or user_id = auth.uid()
);

drop policy if exists "lists_select_members" on public.lists;
create policy "lists_select_members"
on public.lists for select
to authenticated
using (public.is_board_member(board_id));

drop policy if exists "lists_insert_owner_only" on public.lists;
create policy "lists_insert_owner_only"
on public.lists for insert
to authenticated
with check (public.is_board_owner(board_id) and created_by = auth.uid());

drop policy if exists "lists_update_owner_only" on public.lists;
create policy "lists_update_owner_only"
on public.lists for update
to authenticated
using (public.is_board_owner(board_id))
with check (public.is_board_owner(board_id));

drop policy if exists "lists_delete_owner_only" on public.lists;
create policy "lists_delete_owner_only"
on public.lists for delete
to authenticated
using (public.is_board_owner(board_id));

drop policy if exists "tasks_select_members" on public.tasks;
create policy "tasks_select_members"
on public.tasks for select
to authenticated
using (public.is_board_member(board_id));

drop policy if exists "tasks_insert_editors" on public.tasks;
create policy "tasks_insert_editors"
on public.tasks for insert
to authenticated
with check (
  public.can_edit_board_content(board_id)
  and created_by = auth.uid()
);

drop policy if exists "tasks_update_editors" on public.tasks;
create policy "tasks_update_editors"
on public.tasks for update
to authenticated
using (public.can_edit_board_content(board_id))
with check (public.can_edit_board_content(board_id));

drop policy if exists "tasks_delete_owner_or_creator" on public.tasks;
create policy "tasks_delete_owner_or_creator"
on public.tasks for delete
to authenticated
using (
  public.is_board_owner(board_id)
  or created_by = auth.uid()
);

drop policy if exists "labels_select_members" on public.labels;
create policy "labels_select_members"
on public.labels for select
to authenticated
using (public.is_board_member(board_id));

drop policy if exists "labels_mutate_editors" on public.labels;
create policy "labels_mutate_editors"
on public.labels
for all
to authenticated
using (public.can_edit_board_content(board_id))
with check (public.can_edit_board_content(board_id));

drop policy if exists "task_labels_select_members" on public.task_labels;
create policy "task_labels_select_members"
on public.task_labels for select
to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.is_board_member(t.board_id)
  )
);

drop policy if exists "task_labels_mutate_editors" on public.task_labels;
create policy "task_labels_mutate_editors"
on public.task_labels
for all
to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.can_edit_board_content(t.board_id)
  )
)
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.can_edit_board_content(t.board_id)
  )
);

drop policy if exists "task_assignees_select_members" on public.task_assignees;
create policy "task_assignees_select_members"
on public.task_assignees for select
to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.is_board_member(t.board_id)
  )
);

drop policy if exists "task_assignees_mutate_editors" on public.task_assignees;
create policy "task_assignees_mutate_editors"
on public.task_assignees
for all
to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.can_edit_board_content(t.board_id)
  )
)
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.can_edit_board_content(t.board_id)
  )
  and assigned_by = auth.uid()
);

drop policy if exists "comments_select_members" on public.comments;
create policy "comments_select_members"
on public.comments for select
to authenticated
using (public.is_board_member(board_id));

drop policy if exists "comments_insert_editors" on public.comments;
create policy "comments_insert_editors"
on public.comments for insert
to authenticated
with check (
  public.can_edit_board_content(board_id)
  and author_id = auth.uid()
);

drop policy if exists "comments_update_owner_or_author" on public.comments;
create policy "comments_update_owner_or_author"
on public.comments for update
to authenticated
using (
  public.is_board_owner(board_id)
  or author_id = auth.uid()
)
with check (
  public.is_board_owner(board_id)
  or author_id = auth.uid()
);

drop policy if exists "comments_delete_owner_or_author" on public.comments;
create policy "comments_delete_owner_or_author"
on public.comments for delete
to authenticated
using (
  public.is_board_owner(board_id)
  or author_id = auth.uid()
);

drop policy if exists "comment_reactions_select_members" on public.comment_reactions;
create policy "comment_reactions_select_members"
on public.comment_reactions for select
to authenticated
using (
  exists (
    select 1
    from public.comments c
    where c.id = comment_id
      and public.is_board_member(c.board_id)
  )
);

drop policy if exists "comment_reactions_insert_editors" on public.comment_reactions;
create policy "comment_reactions_insert_editors"
on public.comment_reactions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.comments c
    where c.id = comment_id
      and public.can_edit_board_content(c.board_id)
  )
);

drop policy if exists "comment_reactions_delete_own" on public.comment_reactions;
create policy "comment_reactions_delete_own"
on public.comment_reactions for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "invitations_select_owner_or_invitee" on public.invitations;
create policy "invitations_select_owner_or_invitee"
on public.invitations for select
to authenticated
using (
  public.is_board_owner(board_id)
  or lower(email) = public.current_user_email()
);

drop policy if exists "invitations_insert_owner_only" on public.invitations;
create policy "invitations_insert_owner_only"
on public.invitations for insert
to authenticated
with check (public.is_board_owner(board_id) and invited_by = auth.uid());

drop policy if exists "invitations_update_owner_only" on public.invitations;
create policy "invitations_update_owner_only"
on public.invitations for update
to authenticated
using (public.is_board_owner(board_id))
with check (public.is_board_owner(board_id));

drop policy if exists "invitations_delete_owner_only" on public.invitations;
create policy "invitations_delete_owner_only"
on public.invitations for delete
to authenticated
using (public.is_board_owner(board_id));

drop policy if exists "task_activity_select_members" on public.task_activity;
create policy "task_activity_select_members"
on public.task_activity for select
to authenticated
using (public.is_board_member(board_id));

drop policy if exists "task_activity_insert_editors" on public.task_activity;
create policy "task_activity_insert_editors"
on public.task_activity for insert
to authenticated
with check (
  public.can_edit_board_content(board_id)
  and actor_id = auth.uid()
);

drop policy if exists "notification_events_select_own" on public.notification_events;
create policy "notification_events_select_own"
on public.notification_events for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notification_events_update_own" on public.notification_events;
create policy "notification_events_update_own"
on public.notification_events for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
