"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoardRole(formData: FormData, key: string): "member" | "viewer" | "" {
  const value = readString(formData, key);
  if (value === "member" || value === "viewer") return value;
  return "";
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function fallbackNameFromEmail(email: string | null | undefined) {
  if (!email) return "Someone";
  const base = email.split("@")[0]?.trim();
  return base || "Someone";
}

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { supabase, user };
}

async function logTaskActivity(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  boardId: string;
  taskId: string;
  actorId: string;
  actionType: string;
  meta?: Record<string, unknown>;
}) {
  await input.supabase.from("task_activity").insert({
    board_id: input.boardId,
    task_id: input.taskId,
    actor_id: input.actorId,
    action_type: input.actionType,
    meta_json: input.meta ?? {},
  });
}

async function getActorDisplayName(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  userEmail?: string;
}) {
  const { data } = await input.supabase.from("profiles").select("full_name").eq("id", input.userId).maybeSingle();
  const fullName = typeof data?.full_name === "string" ? data.full_name.trim() : "";
  return fullName || fallbackNameFromEmail(input.userEmail);
}

async function getTaskTitle(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  boardId: string;
  taskId: string;
}) {
  const { data } = await input.supabase
    .from("tasks")
    .select("title")
    .eq("id", input.taskId)
    .eq("board_id", input.boardId)
    .maybeSingle();
  return typeof data?.title === "string" ? data.title : "Task";
}

async function listBoardMemberUserIds(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  boardId: string;
}) {
  const { data } = await input.supabase.from("board_members").select("user_id").eq("board_id", input.boardId);
  return (data ?? []).map((row) => row.user_id as string);
}

async function queueNotifications(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  items: Array<{
    user_id: string;
    board_id: string;
    event_type: string;
    payload: Record<string, unknown>;
  }>
) {
  if (items.length === 0) return;
  await supabase.from("notification_events").insert(items);
}

async function isBoardOwner(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  boardId: string;
  userId: string;
}) {
  const { data } = await input.supabase
    .from("board_members")
    .select("role")
    .eq("board_id", input.boardId)
    .eq("user_id", input.userId)
    .maybeSingle();

  return data?.role === "owner";
}

export type UpdateBoardActionResult = {
  ok: boolean;
  message: string;
};

export type InviteBoardMemberActionResult = {
  ok: boolean;
  message: string;
};

export async function createListAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const name = readString(formData, "name");

  if (!boardId || !name) return;

  const { supabase, user } = await requireUser();

  const { data: lastList } = await supabase
    .from("lists")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = Number(lastList?.position ?? 0) + 1000;

  const { error } = await supabase.from("lists").insert({
    board_id: boardId,
    name,
    position: nextPosition,
    created_by: user.id,
  });

  if (error) return;

  revalidatePath(`/app/boards/${boardId}`);
}

export async function updateBoardAction(formData: FormData): Promise<UpdateBoardActionResult> {
  const boardId = readString(formData, "board_id");
  const name = readString(formData, "name");
  const description = readString(formData, "description");

  if (!boardId || !name) {
    return { ok: false, message: "Board name is required." };
  }

  const { supabase, user } = await requireUser();
  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  if (!owner) {
    return { ok: false, message: "Only board owner can edit board details." };
  }

  const { error } = await supabase
    .from("boards")
    .update({ name, description: description || null })
    .eq("id", boardId);

  if (error) {
    return { ok: false, message: "Could not save board changes. Please try again." };
  }

  revalidatePath(`/app/boards/${boardId}`);
  revalidatePath("/app");
  return { ok: true, message: "Board details updated." };
}

export async function deleteBoardAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  if (!boardId) return;

  const { supabase, user } = await requireUser();
  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  if (!owner) return;

  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) return;

  revalidatePath("/app");
  redirect("/app");
}

export async function deleteListAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const listId = readString(formData, "list_id");
  if (!boardId || !listId) return;

  const { supabase, user } = await requireUser();
  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  if (!owner) return;

  const { error } = await supabase.from("lists").delete().eq("id", listId).eq("board_id", boardId);
  if (error) return;

  revalidatePath(`/app/boards/${boardId}`);
}

export async function inviteBoardMemberAction(formData: FormData): Promise<InviteBoardMemberActionResult> {
  const boardId = readString(formData, "board_id");
  const email = normalizeEmail(readString(formData, "email"));
  const role = readBoardRole(formData, "role");

  if (!boardId || !email || !role) {
    return { ok: false, message: "Email and role are required." };
  }

  const { supabase, user } = await requireUser();
  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  if (!owner) {
    return { ok: false, message: "Only board owner can invite members." };
  }
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const token = crypto.randomUUID();

  const { data: existingPendingInvitation } = await supabase
    .from("invitations")
    .select("id")
    .eq("board_id", boardId)
    .eq("status", "pending")
    .eq("email", email)
    .maybeSingle();

  if (existingPendingInvitation?.id) {
    const { error } = await supabase
      .from("invitations")
      .update({
        role,
        expires_at: expiresAt,
        token,
      })
      .eq("id", existingPendingInvitation.id);

    if (error) {
      return { ok: false, message: "Could not update existing invitation." };
    }

    const boardMemberIds = await listBoardMemberUserIds({ supabase, boardId });
    await queueNotifications(
      supabase,
      boardMemberIds
        .filter((memberId) => memberId !== user.id)
        .map((memberId) => ({
          user_id: memberId,
          board_id: boardId,
          event_type: "invitation.updated",
          payload: { email, role, actor_name: actorName },
        }))
    );

    revalidatePath(`/app/boards/${boardId}`);
    revalidatePath("/app");
    return { ok: true, message: "Existing invitation updated." };
  }

  const { error } = await supabase.from("invitations").insert({
    board_id: boardId,
    email,
    role,
    status: "pending",
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    return { ok: false, message: "Could not create invitation. Please try again." };
  }

  const boardMemberIds = await listBoardMemberUserIds({ supabase, boardId });
  await queueNotifications(
    supabase,
    boardMemberIds
      .filter((memberId) => memberId !== user.id)
      .map((memberId) => ({
        user_id: memberId,
        board_id: boardId,
        event_type: "invitation.sent",
        payload: { email, role, actor_name: actorName },
      }))
  );

  revalidatePath(`/app/boards/${boardId}`);
  revalidatePath("/app");
  return { ok: true, message: "Invitation sent." };
}

export async function updateBoardMemberRoleAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const targetUserId = readString(formData, "target_user_id");
  const role = readBoardRole(formData, "role");

  if (!boardId || !targetUserId || !role) return;

  const { supabase, user } = await requireUser();
  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  if (!owner) return;
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });

  const { data: existingMember } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", boardId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!existingMember || existingMember.role === "owner") return;

  const { error } = await supabase
    .from("board_members")
    .update({ role })
    .eq("board_id", boardId)
    .eq("user_id", targetUserId);

  if (error) return;

  await queueNotifications(supabase, [
    {
      user_id: targetUserId,
      board_id: boardId,
      event_type: "membership.role_updated",
      payload: { role, actor_name: actorName },
    },
  ]);

  revalidatePath(`/app/boards/${boardId}`);
}

export async function removeBoardMemberAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const targetUserId = readString(formData, "target_user_id");

  if (!boardId || !targetUserId) return;

  const { supabase, user } = await requireUser();
  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  if (!owner) return;
  if (targetUserId === user.id) return;
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });

  const { data: existingMember } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", boardId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!existingMember || existingMember.role === "owner") return;

  await queueNotifications(supabase, [
    {
      user_id: targetUserId,
      board_id: boardId,
      event_type: "membership.removed",
      payload: { actor_name: actorName },
    },
  ]);

  const { error } = await supabase.from("board_members").delete().eq("board_id", boardId).eq("user_id", targetUserId);
  if (error) return;

  revalidatePath(`/app/boards/${boardId}`);
}

export async function revokeInvitationAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const invitationId = readString(formData, "invitation_id");

  if (!boardId || !invitationId) return;

  const { supabase, user } = await requireUser();
  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  if (!owner) return;

  const { error } = await supabase.from("invitations").delete().eq("id", invitationId).eq("board_id", boardId);
  if (error) return;

  revalidatePath(`/app/boards/${boardId}`);
}

export async function createTaskAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const listId = readString(formData, "list_id");
  const title = readString(formData, "title");
  const description = readString(formData, "description");

  if (!boardId || !listId || !title) return;

  const { supabase, user } = await requireUser();
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });

  const { data: lastTask } = await supabase
    .from("tasks")
    .select("position")
    .eq("board_id", boardId)
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = Number(lastTask?.position ?? 0) + 1000;

  const { data: createdTask, error } = await supabase
    .from("tasks")
    .insert({
      board_id: boardId,
      list_id: listId,
      title,
      description,
      position: nextPosition,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !createdTask) return;

  await logTaskActivity({
    supabase,
    boardId,
    taskId: createdTask.id,
    actorId: user.id,
    actionType: "task.created",
    meta: { title },
  });

  const boardMemberIds = await listBoardMemberUserIds({ supabase, boardId });
  await queueNotifications(
    supabase,
    boardMemberIds
      .filter((memberId) => memberId !== user.id)
      .map((memberId) => ({
        user_id: memberId,
        board_id: boardId,
        event_type: "task.created",
        payload: { task_id: createdTask.id, task_title: title, actor_name: actorName },
      }))
  );

  revalidatePath(`/app/boards/${boardId}`);
}

export async function updateTaskAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const taskId = readString(formData, "task_id");
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const dueDate = readString(formData, "due_date");
  const priorityInput = readString(formData, "priority");
  const statusInput = readString(formData, "status");

  if (!boardId || !taskId || !title) return;

  const priority = ["low", "medium", "high", "urgent"].includes(priorityInput) ? priorityInput : "medium";
  const status = statusInput === "done" ? "done" : "todo";

  const { supabase, user } = await requireUser();
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description,
      due_date: dueDate ? `${dueDate}T00:00:00.000Z` : null,
      priority,
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
      updated_by: user.id,
    })
    .eq("id", taskId)
    .eq("board_id", boardId);

  if (error) return;

  await logTaskActivity({
    supabase,
    boardId,
    taskId,
    actorId: user.id,
    actionType: "task.updated",
    meta: { title, priority, status },
  });

  const boardMemberIds = await listBoardMemberUserIds({ supabase, boardId });
  await queueNotifications(
    supabase,
    boardMemberIds
      .filter((memberId) => memberId !== user.id)
      .map((memberId) => ({
        user_id: memberId,
        board_id: boardId,
        event_type: "task.updated",
        payload: { task_id: taskId, task_title: title, priority, status, actor_name: actorName },
      }))
  );

  revalidatePath(`/app/boards/${boardId}`);
}

export async function deleteTaskAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const taskId = readString(formData, "task_id");
  if (!boardId || !taskId) return;

  const { supabase, user } = await requireUser();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, created_by")
    .eq("id", taskId)
    .eq("board_id", boardId)
    .maybeSingle();
  if (!task) return;

  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  const canDelete = owner || task.created_by === user.id;
  if (!canDelete) return;

  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("board_id", boardId);
  if (error) return;

  revalidatePath(`/app/boards/${boardId}`);
}

export async function createCommentAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const taskId = readString(formData, "task_id");
  const parentCommentId = readString(formData, "parent_comment_id");
  const content = readString(formData, "content");

  if (!boardId || !taskId || !content) return;

  const { supabase, user } = await requireUser();
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });
  const taskTitle = await getTaskTitle({ supabase, boardId, taskId });

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      board_id: boardId,
      task_id: taskId,
      parent_comment_id: parentCommentId || null,
      author_id: user.id,
      content,
    })
    .select("id")
    .single();

  if (error || !comment) return;

  await logTaskActivity({
    supabase,
    boardId,
    taskId,
    actorId: user.id,
    actionType: parentCommentId ? "comment.reply_added" : "comment.added",
    meta: { comment_id: comment.id },
  });

  const boardMemberIds = await listBoardMemberUserIds({ supabase, boardId });
  await queueNotifications(
    supabase,
    boardMemberIds
      .filter((memberId) => memberId !== user.id)
      .map((memberId) => ({
        user_id: memberId,
        board_id: boardId,
        event_type: parentCommentId ? "comment.reply_added" : "comment.added",
        payload: {
          task_id: taskId,
          task_title: taskTitle,
          comment_id: comment.id,
          comment_preview: content.slice(0, 100),
          actor_name: actorName,
        },
      }))
  );

  if (parentCommentId) {
    const { data: parentComment } = await supabase
      .from("comments")
      .select("author_id")
      .eq("id", parentCommentId)
      .eq("board_id", boardId)
      .maybeSingle();
    if (parentComment?.author_id && parentComment.author_id !== user.id) {
      await queueNotifications(supabase, [
        {
          user_id: parentComment.author_id,
          board_id: boardId,
          event_type: "comment.reply_received",
          payload: {
            task_id: taskId,
            task_title: taskTitle,
            comment_id: comment.id,
            comment_preview: content.slice(0, 100),
            actor_name: actorName,
          },
        },
      ]);
    }
  }

  revalidatePath(`/app/boards/${boardId}`);
}

export async function toggleCommentReactionAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const taskId = readString(formData, "task_id");
  const commentId = readString(formData, "comment_id");
  const emoji = readString(formData, "emoji");

  if (!boardId || !taskId || !commentId || !emoji) return;

  const { supabase, user } = await requireUser();
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });
  const taskTitle = await getTaskTitle({ supabase, boardId, taskId });
  const { data: comment } = await supabase
    .from("comments")
    .select("author_id, content")
    .eq("id", commentId)
    .eq("board_id", boardId)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  const isRemovingReaction = Boolean(existing?.id);
  const existingReactionId = existing?.id ?? "";

  if (isRemovingReaction) {
    await supabase.from("comment_reactions").delete().eq("id", existingReactionId);
  } else {
    await supabase.from("comment_reactions").insert({
      comment_id: commentId,
      user_id: user.id,
      emoji,
    });
  }

  await logTaskActivity({
    supabase,
    boardId,
    taskId,
    actorId: user.id,
    actionType: "comment.reaction_toggled",
    meta: { comment_id: commentId, emoji },
  });

  if (!isRemovingReaction && comment?.author_id && comment.author_id !== user.id) {
    await queueNotifications(supabase, [
      {
        user_id: comment.author_id,
        board_id: boardId,
        event_type: "comment.reacted",
        payload: {
          task_id: taskId,
          task_title: taskTitle,
          comment_id: commentId,
          comment_preview: String(comment.content ?? "").slice(0, 100),
          actor_name: actorName,
          emoji,
        },
      },
    ]);
  }

  revalidatePath(`/app/boards/${boardId}`);
}

export async function updateCommentAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const taskId = readString(formData, "task_id");
  const commentId = readString(formData, "comment_id");
  const content = readString(formData, "content");

  if (!boardId || !taskId || !commentId || !content) return;

  const { supabase, user } = await requireUser();
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });
  const taskTitle = await getTaskTitle({ supabase, boardId, taskId });

  const { data: comment } = await supabase
    .from("comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("board_id", boardId)
    .maybeSingle();

  if (!comment) return;

  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  const canEdit = owner || comment.author_id === user.id;
  if (!canEdit) return;

  const { error } = await supabase
    .from("comments")
    .update({ content })
    .eq("id", commentId)
    .eq("board_id", boardId);

  if (error) return;

  await logTaskActivity({
    supabase,
    boardId,
    taskId,
    actorId: user.id,
    actionType: "comment.updated",
    meta: { comment_id: commentId },
  });

  const boardMemberIds = await listBoardMemberUserIds({ supabase, boardId });
  await queueNotifications(
    supabase,
    boardMemberIds
      .filter((memberId) => memberId !== user.id)
      .map((memberId) => ({
        user_id: memberId,
        board_id: boardId,
        event_type: "comment.updated",
        payload: {
          task_id: taskId,
          task_title: taskTitle,
          comment_id: commentId,
          comment_preview: content.slice(0, 100),
          actor_name: actorName,
        },
      }))
  );

  revalidatePath(`/app/boards/${boardId}`);
}

export async function deleteCommentAction(formData: FormData) {
  const boardId = readString(formData, "board_id");
  const taskId = readString(formData, "task_id");
  const commentId = readString(formData, "comment_id");

  if (!boardId || !taskId || !commentId) return;

  const { supabase, user } = await requireUser();
  const actorName = await getActorDisplayName({ supabase, userId: user.id, userEmail: user.email });
  const taskTitle = await getTaskTitle({ supabase, boardId, taskId });

  const { data: comment } = await supabase
    .from("comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("board_id", boardId)
    .maybeSingle();

  if (!comment) return;

  const owner = await isBoardOwner({ supabase, boardId, userId: user.id });
  const canDelete = owner || comment.author_id === user.id;
  if (!canDelete) return;

  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("board_id", boardId);
  if (error) return;

  await logTaskActivity({
    supabase,
    boardId,
    taskId,
    actorId: user.id,
    actionType: "comment.deleted",
    meta: { comment_id: commentId },
  });

  const boardMemberIds = await listBoardMemberUserIds({ supabase, boardId });
  await queueNotifications(
    supabase,
    boardMemberIds
      .filter((memberId) => memberId !== user.id)
      .map((memberId) => ({
        user_id: memberId,
        board_id: boardId,
        event_type: "comment.deleted",
        payload: {
          task_id: taskId,
          task_title: taskTitle,
          comment_id: commentId,
          actor_name: actorName,
        },
      }))
  );

  revalidatePath(`/app/boards/${boardId}`);
}
