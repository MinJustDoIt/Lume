"use client";

import { FormEvent, useEffect, useRef } from "react";

type CreateBoardModalProps = {
  workspaceId: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function CreateBoardModal({ workspaceId, action }: CreateBoardModalProps) {
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
    if (event.target === event.currentTarget) {
      closeModal();
    }
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
        className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
      >
        New board
      </button>

      <dialog
        ref={dialogRef}
        onClose={unlockBodyScroll}
        onClick={onBackdropClick}
        className="fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-xl backdrop:bg-black/60"
      >
        <form
          action={action}
          onSubmit={() => {
            closeModal();
          }}
          className="space-y-4 p-5"
        >
          <input type="hidden" name="workspace_id" value={workspaceId} />

          <div>
            <h3 className="text-lg font-semibold">Create Board</h3>
            <p className="text-sm text-zinc-400">Start a board inside this workspace.</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Board name</span>
            <input
              name="name"
              required
              maxLength={120}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="Roadmap"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Description</span>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="What is this board for?"
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
              Create board
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
