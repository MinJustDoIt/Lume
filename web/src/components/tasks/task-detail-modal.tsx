"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type TaskDetailModalProps = {
  boardId: string;
  task: {
    id: string;
    created_by: string;
    title: string;
    description: string | null;
    priority: "low" | "medium" | "high" | "urgent";
    status: "todo" | "done";
    due_date: string | null;
    created_at: string;
    updated_at: string;
  };
  action: (formData: FormData) => void | Promise<void>;
  deleteTaskAction: (formData: FormData) => void | Promise<void>;
  createCommentAction: (formData: FormData) => void | Promise<void>;
  updateCommentAction: (formData: FormData) => void | Promise<void>;
  toggleCommentReactionAction: (formData: FormData) => void | Promise<void>;
  comments: Array<{
    id: string;
    author_id: string;
    author_name: string;
    content: string;
    parent_comment_id: string | null;
    created_at: string;
    updated_at: string;
  }>;
  reactionsByComment: Record<string, Array<{ id: string; user_id: string; emoji: string }>>;
  activities: Array<{
    id: string;
    actor_id: string;
    actor_name: string;
    action_type: string;
    meta_json: Record<string, unknown> | null;
    created_at: string;
  }>;
  currentUserId: string;
  boardOwnerId: string;
  readOnly?: boolean;
  autoOpen?: boolean;
};

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatUtcDateTime(value: string) {
  const iso = new Date(value).toISOString();
  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

function shortUserId(userId: string) {
  return userId.slice(0, 8);
}

export function TaskDetailModal({
  boardId,
  task,
  action,
  deleteTaskAction,
  createCommentAction,
  updateCommentAction,
  toggleCommentReactionAction,
  comments,
  reactionsByComment,
  activities,
  currentUserId,
  boardOwnerId,
  readOnly = false,
  autoOpen = false,
}: TaskDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editingCommentIds, setEditingCommentIds] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const canDeleteTask = currentUserId === boardOwnerId || currentUserId === task.created_by;

  function lockBodyScroll() {
    document.body.style.overflow = "hidden";
  }

  function unlockBodyScroll() {
    document.body.style.overflow = "";
  }

  function openModal() {
    lockBodyScroll();
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
    unlockBodyScroll();
  }

  function onBackdropClick(event: FormEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeModal();
  }

  function startEditingComment(commentId: string, currentContent: string) {
    setEditingCommentIds((prev) => ({ ...prev, [commentId]: true }));
    setCommentDrafts((prev) => ({ ...prev, [commentId]: prev[commentId] ?? currentContent }));
  }

  function stopEditingComment(commentId: string) {
    setEditingCommentIds((prev) => ({ ...prev, [commentId]: false }));
  }

  useEffect(() => {
    return () => {
      unlockBodyScroll();
    };
  }, []);

  useEffect(() => {
    if (autoOpen && dialogRef.current && !dialogRef.current.open) {
      lockBodyScroll();
      dialogRef.current.showModal();
    }
  }, [autoOpen]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="w-full cursor-pointer text-left"
        aria-label={`Open details for ${task.title}`}
      >
        <article className="rounded-md border border-zinc-800 bg-zinc-950 p-3 transition hover:border-zinc-700">
          <p className="text-sm font-medium">{task.title}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Updated {formatUtcDateTime(task.updated_at || task.created_at)}
          </p>
        </article>
      </button>

      <dialog
        ref={dialogRef}
        onClose={unlockBodyScroll}
        onClick={onBackdropClick}
        className="fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-xl backdrop:bg-black/60"
      >
        <form
          action={action}
          onSubmit={() => {
            closeModal();
          }}
          className="space-y-4 p-5"
        >
          <input type="hidden" name="board_id" value={boardId} />
          <input type="hidden" name="task_id" value={task.id} />

          <div>
            <h3 className="text-lg font-semibold">Task details</h3>
            <p className="text-sm text-zinc-400">
              {readOnly ? "View task details." : "Edit task content and status."}
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Title</span>
            <div className="group relative">
              <input
                name="title"
                required
                maxLength={180}
                defaultValue={task.title}
                disabled={readOnly}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-80"
              />
              {readOnly ? (
                <span
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100"
                  title="View only"
                >
                  🔒
                </span>
              ) : null}
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Description</span>
            <div className="group relative">
              <textarea
                name="description"
                rows={4}
                defaultValue={task.description ?? ""}
                disabled={readOnly}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-80"
              />
              {readOnly ? (
                <span className="pointer-events-none absolute right-2 top-3 opacity-0 transition group-hover:opacity-100">
                  🔒
                </span>
              ) : null}
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-zinc-300">Due date</span>
              <div className="group relative">
                <input
                  type="date"
                  name="due_date"
                  defaultValue={toDateInputValue(task.due_date)}
                  disabled={readOnly}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-80"
                />
                {readOnly ? (
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
                    🔒
                  </span>
                ) : null}
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-zinc-300">Priority</span>
              <div className="group relative">
                <select
                  name="priority"
                  defaultValue={task.priority}
                  disabled={readOnly}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 pr-12 text-sm outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                {readOnly ? (
                  <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
                    🔒
                  </span>
                ) : null}
              </div>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Status</span>
            <div className="group relative">
              <select
                name="status"
                defaultValue={task.status}
                disabled={readOnly}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 pr-12 text-sm outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-80"
              >
                <option value="todo">Todo</option>
                <option value="done">Done</option>
              </select>
              {readOnly ? (
                <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
                  🔒
                </span>
              ) : null}
            </div>
          </label>

          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
            <p>Created: {formatUtcDateTime(task.created_at)}</p>
            <p className="mt-1">Last updated: {formatUtcDateTime(task.updated_at)}</p>
          </div>

          <div className="flex items-center justify-end gap-2">
            {!readOnly && canDeleteTask ? (
              <button
                type="submit"
                formAction={deleteTaskAction}
                formNoValidate
                className="mr-auto rounded-md border border-red-800 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/50"
              >
                Delete task
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
            >
              Close
            </button>
            {!readOnly ? (
              <button
                type="submit"
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Save changes
              </button>
            ) : null}
          </div>
        </form>

        <div className="border-t border-zinc-800 p-5 pt-4">
          <h4 className="text-sm font-semibold">Comments</h4>
          {!readOnly ? (
            <form action={createCommentAction} className="mt-3 space-y-2">
              <input type="hidden" name="board_id" value={boardId} />
              <input type="hidden" name="task_id" value={task.id} />
              <textarea
                name="content"
                rows={3}
                required
                placeholder="Write a comment..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                >
                  Add comment
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-3 space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-500">No comments yet.</p>
            ) : (
              comments
                .filter((comment) => !comment.parent_comment_id)
                .map((comment) => {
                  const replies = comments.filter((item) => item.parent_comment_id === comment.id);
                  return (
                    <div key={comment.id} className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-xs text-zinc-400">
                        <span className="font-medium text-zinc-200">{comment.author_name}</span> ·{" "}
                        <span>ID {shortUserId(comment.author_id)}</span> ·{" "}
                        {formatUtcDateTime(comment.created_at)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-200">{comment.content}</p>

                      {!readOnly && (currentUserId === comment.author_id || currentUserId === boardOwnerId) ? (
                        <div className="mt-2">
                          {editingCommentIds[comment.id] ? (
                            <form
                              action={updateCommentAction}
                              className="space-y-2"
                              onSubmit={() => {
                                stopEditingComment(comment.id);
                              }}
                            >
                              <input type="hidden" name="board_id" value={boardId} />
                              <input type="hidden" name="task_id" value={task.id} />
                              <input type="hidden" name="comment_id" value={comment.id} />
                              <textarea
                                name="content"
                                rows={2}
                                required
                                value={commentDrafts[comment.id] ?? comment.content}
                                onChange={(event) =>
                                  setCommentDrafts((prev) => ({ ...prev, [comment.id]: event.target.value }))
                                }
                                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => stopEditingComment(comment.id)}
                                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-900"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                >
                                  Update
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => startEditingComment(comment.id, comment.content)}
                                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {!readOnly ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {["👍", "❤️", "🎉", "👀"].map((emoji) => {
                            const reactions = reactionsByComment[comment.id] ?? [];
                            const count = reactions.filter((item) => item.emoji === emoji).length;
                            const hasMine = reactions.some(
                              (item) => item.emoji === emoji && item.user_id === currentUserId
                            );
                            return (
                              <form key={emoji} action={toggleCommentReactionAction}>
                                <input type="hidden" name="board_id" value={boardId} />
                                <input type="hidden" name="task_id" value={task.id} />
                                <input type="hidden" name="comment_id" value={comment.id} />
                                <input type="hidden" name="emoji" value={emoji} />
                                <button
                                  type="submit"
                                  className={`rounded border px-2 py-1 text-xs ${
                                    hasMine
                                      ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                                  }`}
                                >
                                  {emoji} {count > 0 ? count : ""}
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      ) : null}

                      {!readOnly ? (
                        <form action={createCommentAction} className="mt-2 space-y-2">
                          <input type="hidden" name="board_id" value={boardId} />
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="parent_comment_id" value={comment.id} />
                          <textarea
                            name="content"
                            rows={2}
                            required
                            placeholder="Reply..."
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                          />
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                            >
                              Reply
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {replies.length > 0 ? (
                        <div className="mt-3 space-y-2 border-l border-zinc-700 pl-3">
                          {replies.map((reply) => (
                            <div key={reply.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-2">
                              <p className="text-xs text-zinc-400">
                                <span className="font-medium text-zinc-200">{reply.author_name}</span> ·{" "}
                                <span>ID {shortUserId(reply.author_id)}</span> ·{" "}
                                {formatUtcDateTime(reply.created_at)}
                              </p>
                              <p className="mt-1 text-sm text-zinc-200">{reply.content}</p>

                              {!readOnly && (currentUserId === reply.author_id || currentUserId === boardOwnerId) ? (
                                <div className="mt-2">
                                  {editingCommentIds[reply.id] ? (
                                    <form
                                      action={updateCommentAction}
                                      className="space-y-2"
                                      onSubmit={() => {
                                        stopEditingComment(reply.id);
                                      }}
                                    >
                                      <input type="hidden" name="board_id" value={boardId} />
                                      <input type="hidden" name="task_id" value={task.id} />
                                      <input type="hidden" name="comment_id" value={reply.id} />
                                      <textarea
                                        name="content"
                                        rows={2}
                                        required
                                        value={commentDrafts[reply.id] ?? reply.content}
                                        onChange={(event) =>
                                          setCommentDrafts((prev) => ({ ...prev, [reply.id]: event.target.value }))
                                        }
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                                      />
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => stopEditingComment(reply.id)}
                                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-900"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                        >
                                          Update
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex items-center justify-end">
                                      <button
                                        type="button"
                                        onClick={() => startEditingComment(reply.id, reply.content)}
                                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="border-t border-zinc-800 p-5 pt-4">
          <h4 className="text-sm font-semibold">Activity</h4>
          <div className="mt-3 space-y-2">
            {activities.length === 0 ? (
              <p className="text-xs text-zinc-500">No activity yet.</p>
            ) : (
              activities.slice(0, 12).map((activity) => (
                <div key={activity.id} className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2 text-xs text-zinc-300">
                  <p>
                    <span className="font-medium text-zinc-100">{activity.actor_name}</span>{" "}
                    <span className="text-zinc-500">(ID {shortUserId(activity.actor_id)})</span>{" "}
                    <span className="text-zinc-400">{activity.action_type}</span>
                  </p>
                  <p className="mt-1 text-zinc-500">{formatUtcDateTime(activity.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
