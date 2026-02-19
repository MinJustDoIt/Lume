"use client";

import { FormEvent, useEffect, useRef } from "react";

type CreateTaskModalProps = {
  boardId: string;
  listId: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function CreateTaskModal({ boardId, listId, action }: CreateTaskModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    return () => {
      unlockBodyScroll();
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="w-full rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
      >
        + New Task
      </button>

      <dialog
        ref={dialogRef}
        onClose={unlockBodyScroll}
        onClick={onBackdropClick}
        className="fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-xl backdrop:bg-black/60"
      >
        <form
          action={action}
          onSubmit={() => {
            closeModal();
          }}
          className="space-y-4 p-5"
        >
          <input type="hidden" name="board_id" value={boardId} />
          <input type="hidden" name="list_id" value={listId} />

          <div>
            <h3 className="text-lg font-semibold">Create Task</h3>
            <p className="text-sm text-zinc-400">Add a new task to this list.</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Title</span>
            <input
              name="title"
              required
              maxLength={180}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="Implement board drag and drop"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Description</span>
            <textarea
              name="description"
              rows={4}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="Add details, scope, or acceptance criteria"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Create task
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
