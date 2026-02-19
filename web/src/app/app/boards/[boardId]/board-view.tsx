"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CreateTaskModal, TaskDetailModal } from "@/components/tasks";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/browser";

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

type BoardViewProps = {
  boardId: string;
  lists: ListRow[];
  initialTasks: TaskRow[];
  canEditBoardContent: boolean;
  createTaskAction: (formData: FormData) => void | Promise<void>;
  deleteListAction: (formData: FormData) => void | Promise<void>;
  deleteTaskAction: (formData: FormData) => void | Promise<void>;
  updateTaskAction: (formData: FormData) => void | Promise<void>;
  createCommentAction: (formData: FormData) => void | Promise<void>;
  updateCommentAction: (formData: FormData) => void | Promise<void>;
  toggleCommentReactionAction: (formData: FormData) => void | Promise<void>;
  commentsByTask: Record<
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
  >;
  reactionsByComment: Record<string, Array<{ id: string; user_id: string; emoji: string }>>;
  activitiesByTask: Record<
    string,
    Array<{
      id: string;
      actor_id: string;
      actor_name: string;
      action_type: string;
      meta_json: Record<string, unknown> | null;
      created_at: string;
    }>
  >;
  currentUserId: string;
  boardOwnerId: string;
  focusedTaskId?: string | null;
};

type SortableTaskCardProps = {
  boardId: string;
  task: TaskRow;
  deleteTaskAction: (formData: FormData) => void | Promise<void>;
  updateTaskAction: (formData: FormData) => void | Promise<void>;
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
  canEditBoardContent: boolean;
  focusedTaskId?: string | null;
};

type SortableListColumnProps = {
  boardId: string;
  list: ListRow;
  listTasks: TaskRow[];
  createTaskAction: (formData: FormData) => void | Promise<void>;
  deleteListAction: (formData: FormData) => void | Promise<void>;
  deleteTaskAction: (formData: FormData) => void | Promise<void>;
  updateTaskAction: (formData: FormData) => void | Promise<void>;
  createCommentAction: (formData: FormData) => void | Promise<void>;
  updateCommentAction: (formData: FormData) => void | Promise<void>;
  toggleCommentReactionAction: (formData: FormData) => void | Promise<void>;
  commentsByTask: Record<
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
  >;
  reactionsByComment: Record<string, Array<{ id: string; user_id: string; emoji: string }>>;
  activitiesByTask: Record<
    string,
    Array<{
      id: string;
      actor_id: string;
      actor_name: string;
      action_type: string;
      meta_json: Record<string, unknown> | null;
      created_at: string;
    }>
  >;
  currentUserId: string;
  boardOwnerId: string;
  canEditBoardContent: boolean;
  focusedTaskId?: string | null;
};

function listSortableId(listId: string) {
  return `listcol:${listId}`;
}

function SortableTaskCard({
  boardId,
  task,
  deleteTaskAction,
  updateTaskAction,
  createCommentAction,
  updateCommentAction,
  toggleCommentReactionAction,
  comments,
  reactionsByComment,
  activities,
  currentUserId,
  boardOwnerId,
  canEditBoardContent,
  focusedTaskId,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md">
      {canEditBoardContent ? (
        <div className="mb-1 flex items-center justify-end">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] tracking-wide text-zinc-400 hover:bg-zinc-800"
            aria-label="Drag task"
          >
            ⋮⋮
          </button>
        </div>
      ) : null}
      <TaskDetailModal
        boardId={boardId}
        task={task}
        action={updateTaskAction}
        deleteTaskAction={deleteTaskAction}
        readOnly={!canEditBoardContent}
        createCommentAction={createCommentAction}
        updateCommentAction={updateCommentAction}
        toggleCommentReactionAction={toggleCommentReactionAction}
        comments={comments}
        reactionsByComment={reactionsByComment}
        activities={activities}
        currentUserId={currentUserId}
        boardOwnerId={boardOwnerId}
        autoOpen={focusedTaskId === task.id}
      />
    </div>
  );
}

type DroppableListColumnProps = {
  listId: string;
  children: ReactNode;
};

function DroppableListColumn({ listId, children }: DroppableListColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `list:${listId}`,
    data: { listId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 flex-col ${isOver ? "rounded-md bg-zinc-800/40 p-1 transition" : ""}`}
    >
      {children}
    </div>
  );
}

function SortableListColumn({
  boardId,
  list,
  listTasks,
  createTaskAction,
  deleteListAction,
  deleteTaskAction,
  updateTaskAction,
  createCommentAction,
  updateCommentAction,
  toggleCommentReactionAction,
  commentsByTask,
  reactionsByComment,
  activitiesByTask,
  currentUserId,
  boardOwnerId,
  canEditBoardContent,
  focusedTaskId,
}: SortableListColumnProps) {
  const sortableId = listSortableId(list.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: {
      type: "list",
      listId: list.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 md:w-[300px] md:min-w-[300px]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{list.name}</h2>
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{listTasks.length}</span>
          {canEditBoardContent && currentUserId === boardOwnerId ? (
            <details className="relative">
              <summary
                className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
                aria-label={`Open ${list.name} options`}
              >
                ⋮
              </summary>
              <div className="absolute right-0 top-7 z-20 min-w-[9rem] rounded-md border border-zinc-700 bg-zinc-950 p-1 shadow-lg">
                <form action={deleteListAction}>
                  <input type="hidden" name="board_id" value={boardId} />
                  <input type="hidden" name="list_id" value={list.id} />
                  <button
                    type="submit"
                    className="w-full rounded px-2 py-1.5 text-left text-xs text-red-300 hover:bg-red-950/40"
                  >
                    Delete list
                  </button>
                </form>
              </div>
            </details>
          ) : null}
          {canEditBoardContent ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              title="Drag and drop list"
              className="cursor-grab rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] tracking-wide text-zinc-400 hover:bg-zinc-800 active:cursor-grabbing"
              aria-label={`Drag ${list.name} list`}
            >
              ⋮⋮
            </button>
          ) : null}
        </div>
      </div>

      <DroppableListColumn listId={list.id}>
        <div className="linear-scrollbar flex flex-col gap-2 overflow-y-visible md:pr-1">
          <SortableContext items={listTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            {listTasks.length === 0 ? (
              <p className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-500">
                No tasks in this list.
              </p>
            ) : (
              listTasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  boardId={boardId}
                  task={task}
                  deleteTaskAction={deleteTaskAction}
                  updateTaskAction={updateTaskAction}
                  createCommentAction={createCommentAction}
                  updateCommentAction={updateCommentAction}
                  toggleCommentReactionAction={toggleCommentReactionAction}
                  comments={commentsByTask[task.id] ?? []}
                  reactionsByComment={reactionsByComment}
                  activities={activitiesByTask[task.id] ?? []}
                  currentUserId={currentUserId}
                  boardOwnerId={boardOwnerId}
                  canEditBoardContent={canEditBoardContent}
                  focusedTaskId={focusedTaskId}
                />
              ))
            )}
          </SortableContext>
        </div>
      </DroppableListColumn>

      {canEditBoardContent ? <CreateTaskModal boardId={boardId} listId={list.id} action={createTaskAction} /> : null}
    </section>
  );
}

export function BoardView({
  boardId,
  lists,
  initialTasks,
  canEditBoardContent,
  createTaskAction,
  deleteListAction,
  deleteTaskAction,
  updateTaskAction,
  createCommentAction,
  updateCommentAction,
  toggleCommentReactionAction,
  commentsByTask,
  reactionsByComment,
  activitiesByTask,
  currentUserId,
  boardOwnerId,
  focusedTaskId,
}: BoardViewProps) {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const [listState, setListState] = useState<ListRow[]>(lists);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);

  useEffect(() => {
    setListState(lists);
  }, [lists]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 250);
    };

    const channel = supabase
      .channel(`board-realtime-${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${boardId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists", filter: `board_id=eq.${boardId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `board_id=eq.${boardId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_activity", filter: `board_id=eq.${boardId}` },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [boardId, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByList = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const list of listState) map.set(list.id, []);
    for (const task of tasks) {
      const arr = map.get(task.list_id);
      if (arr) arr.push(task);
    }
    return map;
  }, [listState, tasks]);

  async function persistListChanges(nextLists: ListRow[]) {
    const updates = nextLists.map((list, index) => ({
      id: list.id,
      position: (index + 1) * 1000,
    }));

    await fetch(`/api/boards/${boardId}/lists/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  }

  async function persistChanges(nextTasks: TaskRow[], affectedListIds: string[]) {
    const updates = affectedListIds.flatMap((listId) => {
      const listTasks = nextTasks
        .filter((task) => task.list_id === listId)
        .map((task, index) => ({
          id: task.id,
          listId,
          position: (index + 1) * 1000,
        }));
      return listTasks;
    });

    await fetch(`/api/boards/${boardId}/tasks/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!canEditBoardContent) return;
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    if (activeId.startsWith("listcol:")) {
      if (!overId.startsWith("listcol:")) return;

      const activeListId = activeId.replace("listcol:", "");
      const overListId = overId.replace("listcol:", "");

      const oldIndex = listState.findIndex((list) => list.id === activeListId);
      const newIndex = listState.findIndex((list) => list.id === overListId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const reordered = arrayMove(listState, oldIndex, newIndex).map((list, index) => ({
        ...list,
        position: (index + 1) * 1000,
      }));

      setListState(reordered);
      await persistListChanges(reordered);
      return;
    }

    const activeTask = tasks.find((task) => task.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find((task) => task.id === overId);
    const destinationListId = overTask
      ? overTask.list_id
      : overId.startsWith("list:")
        ? overId.replace("list:", "")
        : overId.startsWith("listcol:")
          ? overId.replace("listcol:", "")
          : null;
    if (!destinationListId) return;

    const sourceListId = activeTask.list_id;

    if (sourceListId === destinationListId && overTask) {
      const listTasks = tasks.filter((task) => task.list_id === sourceListId);
      const oldIndex = listTasks.findIndex((task) => task.id === activeId);
      const newIndex = listTasks.findIndex((task) => task.id === overTask.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const moved = arrayMove(listTasks, oldIndex, newIndex).map((task, index) => ({
        ...task,
        position: (index + 1) * 1000,
      }));

      const nextTasks = tasks.map((task) => moved.find((m) => m.id === task.id) ?? task);
      setTasks(nextTasks);
      await persistChanges(nextTasks, [sourceListId]);
      return;
    }

    const destinationListTasks = tasks.filter((task) => task.list_id === destinationListId && task.id !== activeId);
    const insertIndex = overTask
      ? destinationListTasks.findIndex((task) => task.id === overTask.id)
      : destinationListTasks.length;
    const nextInsertIndex = insertIndex < 0 ? destinationListTasks.length : insertIndex;

    const movedTask: TaskRow = {
      ...activeTask,
      list_id: destinationListId,
    };
    destinationListTasks.splice(nextInsertIndex, 0, movedTask);

    const sourceListTasks = tasks.filter((task) => task.list_id === sourceListId && task.id !== activeId);

    const updatedDestination = destinationListTasks.map((task, index) => ({ ...task, position: (index + 1) * 1000 }));
    const updatedSource = sourceListTasks.map((task, index) => ({ ...task, position: (index + 1) * 1000 }));

    const byId = new Map<string, TaskRow>();
    for (const task of tasks) byId.set(task.id, task);
    for (const task of updatedSource) byId.set(task.id, task);
    for (const task of updatedDestination) byId.set(task.id, task);

    const nextTasks = tasks.map((task) => byId.get(task.id) ?? task);
    setTasks(nextTasks);
    await persistChanges(nextTasks, [sourceListId, destinationListId]);
  }

  if (!isHydrated) {
    return (
      <div className="board-fixed-canvas linear-scrollbar min-h-0 overflow-x-auto overflow-y-visible pb-2">
        <div className="board-fixed-row flex min-w-max flex-col gap-3 lg:flex-row lg:items-start">
          {listState.map((list) => {
            const listTasks = tasksByList.get(list.id) ?? [];
            return (
              <section
                key={list.id}
                className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 md:w-[300px] md:min-w-[300px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{list.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{listTasks.length}</span>
                    {canEditBoardContent && currentUserId === boardOwnerId ? (
                      <details className="relative">
                        <summary
                          className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
                          aria-label={`Open ${list.name} options`}
                        >
                          ⋮
                        </summary>
                        <div className="absolute right-0 top-7 z-20 min-w-[9rem] rounded-md border border-zinc-700 bg-zinc-950 p-1 shadow-lg">
                          <form action={deleteListAction}>
                            <input type="hidden" name="board_id" value={boardId} />
                            <input type="hidden" name="list_id" value={list.id} />
                            <button
                              type="submit"
                              className="w-full rounded px-2 py-1.5 text-left text-xs text-red-300 hover:bg-red-950/40"
                            >
                              Delete list
                            </button>
                          </form>
                        </div>
                      </details>
                    ) : null}
                    {canEditBoardContent ? (
                      <button
                        type="button"
                        className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] tracking-wide text-zinc-400"
                        aria-label={`Drag ${list.name} list`}
                        disabled
                      >
                        ⋮⋮
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="linear-scrollbar flex flex-col gap-2 md:overflow-y-visible md:pr-1">
                  {listTasks.length === 0 ? (
                    <p className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-500">
                      No tasks in this list.
                    </p>
                  ) : (
                    listTasks.map((task) => (
                      <div key={task.id} className="rounded-md">
                        <TaskDetailModal
                          boardId={boardId}
                          task={task}
                          action={updateTaskAction}
                          deleteTaskAction={deleteTaskAction}
                          readOnly={!canEditBoardContent}
                          createCommentAction={createCommentAction}
                          updateCommentAction={updateCommentAction}
                          toggleCommentReactionAction={toggleCommentReactionAction}
                          comments={commentsByTask[task.id] ?? []}
                          reactionsByComment={reactionsByComment}
                          activities={activitiesByTask[task.id] ?? []}
                          currentUserId={currentUserId}
                          boardOwnerId={boardOwnerId}
                          autoOpen={focusedTaskId === task.id}
                        />
                      </div>
                    ))
                  )}
                </div>

                {canEditBoardContent ? <CreateTaskModal boardId={boardId} listId={list.id} action={createTaskAction} /> : null}
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="board-fixed-canvas linear-scrollbar min-h-0 overflow-x-auto overflow-y-visible pb-2">
        <div className="board-fixed-row flex min-w-max flex-col gap-3 lg:flex-row lg:items-start">
          <SortableContext items={listState.map((list) => listSortableId(list.id))} strategy={horizontalListSortingStrategy}>
            {listState.map((list) => {
              const listTasks = tasksByList.get(list.id) ?? [];
              return (
                <SortableListColumn
                  key={list.id}
                  boardId={boardId}
                  list={list}
                  listTasks={listTasks}
                  createTaskAction={createTaskAction}
                  deleteListAction={deleteListAction}
                  deleteTaskAction={deleteTaskAction}
                  updateTaskAction={updateTaskAction}
                  createCommentAction={createCommentAction}
                  updateCommentAction={updateCommentAction}
                  toggleCommentReactionAction={toggleCommentReactionAction}
                  commentsByTask={commentsByTask}
                  reactionsByComment={reactionsByComment}
                  activitiesByTask={activitiesByTask}
                  currentUserId={currentUserId}
                  boardOwnerId={boardOwnerId}
                  canEditBoardContent={canEditBoardContent}
                  focusedTaskId={focusedTaskId}
                />
              );
            })}
          </SortableContext>
        </div>
      </div>
    </DndContext>
  );
}
