import Link from "next/link";
import { notFound } from "next/navigation";
import { EditBoardModal, ManagePeopleModal } from "@/components/boards";
import {
  createCommentAction,
  createListAction,
  createTaskAction,
  deleteBoardAction,
  deleteListAction,
  deleteTaskAction,
  inviteBoardMemberAction,
  removeBoardMemberAction,
  revokeInvitationAction,
  toggleCommentReactionAction,
  updateBoardAction,
  updateBoardMemberRoleAction,
  updateCommentAction,
  updateTaskAction,
} from "./actions";
import { BoardView } from "./board-view";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type BoardPageProps = {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ task?: string }>;
};

type ListRow = {
  id: string;
  name: string;
  position: number | string;
};

type TaskRow = {
  id: string;
  list_id: string;
  created_by: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "done";
  updated_at: string;
  created_at: string;
  position: number | string;
};

type CommentRow = {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
};

type ReactionRow = {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
};

type ActivityRow = {
  id: string;
  task_id: string;
  actor_id: string;
  action_type: string;
  meta_json: Record<string, unknown> | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type BoardMemberRow = {
  user_id: string;
  role: "owner" | "member" | "viewer";
  created_at: string;
};

type InvitationRow = {
  id: string;
  email: string;
  role: "member" | "viewer";
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by: string;
  expires_at: string;
  created_at: string;
};

export default async function BoardPage({ params, searchParams }: BoardPageProps) {
  const { boardId } = await params;
  const { task: taskQuery } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: board } = await supabase
    .from("boards")
    .select("id, name, description, created_by")
    .eq("id", boardId)
    .maybeSingle();
  if (!board) notFound();

  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, list_id, created_by, title, description, due_date, priority, status, updated_at, created_at, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  const listRows = (lists ?? []) as ListRow[];
  const taskRows = (tasks ?? []) as TaskRow[];
  const focusedTaskId = taskRows.some((task) => task.id === taskQuery) ? taskQuery ?? null : null;

  const { data: boardMembers } = await supabase
    .from("board_members")
    .select("user_id, role, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  const memberRows = (boardMembers ?? []) as BoardMemberRow[];
  const currentMembership = memberRows.find((member) => member.user_id === user?.id);
  const currentBoardRole = currentMembership?.role ?? null;
  const isBoardOwner = currentBoardRole === "owner";
  const canEditBoardContent = currentBoardRole === "owner" || currentBoardRole === "member";
  const canManagePeople = currentBoardRole === "owner" || currentBoardRole === "member";

  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, email, role, status, invited_by, expires_at, created_at")
    .eq("board_id", boardId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const invitationRows = (invitations ?? []) as InvitationRow[];

  const { data: comments } = await supabase
    .from("comments")
    .select("id, task_id, author_id, content, parent_comment_id, created_at, updated_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  const commentRows = (comments ?? []) as CommentRow[];

  const commentIds = commentRows.map((comment) => comment.id);
  let reactionRows: ReactionRow[] = [];
  if (commentIds.length > 0) {
    const { data: reactions } = await supabase
      .from("comment_reactions")
      .select("id, comment_id, user_id, emoji")
      .in("comment_id", commentIds);
    reactionRows = (reactions ?? []) as ReactionRow[];
  }

  const { data: activities } = await supabase
    .from("task_activity")
    .select("id, task_id, actor_id, action_type, meta_json, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  const activityRows = (activities ?? []) as ActivityRow[];

  const profileIds = Array.from(
    new Set([
      ...memberRows.map((member) => member.user_id),
      ...invitationRows.map((invitation) => invitation.invited_by),
      ...commentRows.map((comment) => comment.author_id),
      ...activityRows.map((activity) => activity.actor_id),
    ])
  );

  const profileMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", profileIds);
    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile.full_name?.trim() || "User");
    }
  }

  const memberItems = memberRows.map((member) => ({
    userId: member.user_id,
    name: profileMap.get(member.user_id) ?? "User",
    role: member.role,
    isCurrentUser: member.user_id === user?.id,
  }));
  const invitationItems = invitationRows.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expires_at,
  }));

  const commentsByTask: Record<
    string,
    Array<{
      id: string;
      author_id: string;
      author_name: string;
      content: string;
      parent_comment_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  > = {};

  for (const comment of commentRows) {
    commentsByTask[comment.task_id] ??= [];
    commentsByTask[comment.task_id].push({
      id: comment.id,
      author_id: comment.author_id,
      author_name: profileMap.get(comment.author_id) ?? "User",
      content: comment.content,
      parent_comment_id: comment.parent_comment_id,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    });
  }

  const reactionsByComment: Record<string, Array<{ id: string; user_id: string; emoji: string }>> = {};
  for (const reaction of reactionRows) {
    reactionsByComment[reaction.comment_id] ??= [];
    reactionsByComment[reaction.comment_id].push({
      id: reaction.id,
      user_id: reaction.user_id,
      emoji: reaction.emoji,
    });
  }

  const activitiesByTask: Record<
    string,
    Array<{
      id: string;
      actor_id: string;
      actor_name: string;
      action_type: string;
      meta_json: Record<string, unknown> | null;
      created_at: string;
    }>
  > = {};

  for (const activity of activityRows) {
    activitiesByTask[activity.task_id] ??= [];
    activitiesByTask[activity.task_id].push({
      id: activity.id,
      actor_id: activity.actor_id,
      actor_name: profileMap.get(activity.actor_id) ?? "User",
      action_type: activity.action_type,
      meta_json: activity.meta_json,
      created_at: activity.created_at,
    });
  }

  return (
    <section className="board-fixed-shell flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Board</p>
          <h1 className="text-xl font-semibold">{board.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">{board.description || "No description."}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
              Members {memberRows.length}
            </span>
            {isBoardOwner ? (
              <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                Pending invites {invitationRows.length}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManagePeople ? (
            <ManagePeopleModal
              boardId={boardId}
              isBoardOwner={isBoardOwner}
              members={memberItems}
              invitations={invitationItems}
              inviteAction={inviteBoardMemberAction}
              updateMemberRoleAction={updateBoardMemberRoleAction}
              removeMemberAction={removeBoardMemberAction}
              revokeInvitationAction={revokeInvitationAction}
            />
          ) : null}
          {isBoardOwner ? (
            <EditBoardModal
              boardId={board.id}
              initialName={board.name}
              initialDescription={board.description ?? ""}
              action={updateBoardAction}
            />
          ) : null}
          {isBoardOwner ? (
            <form action={deleteBoardAction}>
              <input type="hidden" name="board_id" value={board.id} />
              <button
                type="submit"
                className="rounded-md border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
              >
                Delete board
              </button>
            </form>
          ) : null}
          <Link
            href="/app"
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Back to workspaces
          </Link>
        </div>
      </div>

      {canEditBoardContent ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <form action={createListAction} className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input type="hidden" name="board_id" value={boardId} />
            <input
              name="name"
              required
              maxLength={120}
              placeholder="New list name"
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500 sm:w-72"
            />
            <button
              type="submit"
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Add list
            </button>
          </form>
        </div>
      ) : null}

      {listRows.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
          No lists yet. Add your first list to start planning tasks.
        </p>
      ) : (
        <div className="board-fixed-content min-h-0">
          <BoardView
            boardId={boardId}
            lists={listRows}
            initialTasks={taskRows}
            createTaskAction={createTaskAction}
            deleteListAction={deleteListAction}
            deleteTaskAction={deleteTaskAction}
            updateTaskAction={updateTaskAction}
            canEditBoardContent={canEditBoardContent}
            createCommentAction={createCommentAction}
            updateCommentAction={updateCommentAction}
            toggleCommentReactionAction={toggleCommentReactionAction}
            commentsByTask={commentsByTask}
            reactionsByComment={reactionsByComment}
            activitiesByTask={activitiesByTask}
            currentUserId={user?.id ?? ""}
            boardOwnerId={board.created_by}
            focusedTaskId={focusedTaskId}
          />
        </div>
      )}
    </section>
  );
}
