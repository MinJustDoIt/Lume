"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type UpdateBoardActionResult = {
  ok: boolean;
  message: string;
};

type EditBoardModalProps = {
  boardId: string;
  initialName: string;
  initialDescription: string;
  action: (formData: FormData) => Promise<UpdateBoardActionResult>;
};

export function EditBoardModal({ boardId, initialName, initialDescription, action }: EditBoardModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<UpdateBoardActionResult | null>(null);

  function lockBodyScroll() {
    document.body.style.overflow = "hidden";
  }

  function unlockBodyScroll() {
    document.body.style.overflow = "";
  }

  function openModal() {
    setStatus(null);
    lockBodyScroll();
    dialogRef.current?.showModal();
  }

  function closeModal() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
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
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      unlockBodyScroll();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const result = await action(formData);

    setIsSaving(false);
    setStatus(result);

    if (result.ok) {
      closeTimerRef.current = window.setTimeout(() => {
        closeModal();
      }, 500);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
      >
        Edit board
      </button>

      <dialog
        ref={dialogRef}
        onClose={unlockBodyScroll}
        onClick={onBackdropClick}
        className="fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-xl backdrop:bg-black/60"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <input type="hidden" name="board_id" value={boardId} />

          <div>
            <h3 className="text-lg font-semibold">Edit board</h3>
            <p className="text-sm text-zinc-400">Update board name and description.</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Board name</span>
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={initialName}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Description</span>
            <textarea
              name="description"
              rows={4}
              defaultValue={initialDescription}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            {status ? (
              <p className={`mr-auto text-xs ${status.ok ? "text-emerald-400" : "text-red-400"}`}>{status.message}</p>
            ) : null}
            <button
              type="button"
              onClick={closeModal}
              disabled={isSaving}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
