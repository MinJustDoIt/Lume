"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type MemberItem = {
  userId: string;
  name: string;
  role: "owner" | "member" | "viewer";
  isCurrentUser: boolean;
};

type InvitationItem = {
  id: string;
  email: string;
  role: "member" | "viewer";
  expiresAt: string;
};

type ManagePeopleModalProps = {
  boardId: string;
  isBoardOwner: boolean;
  members: MemberItem[];
  invitations: InvitationItem[];
  inviteAction: (formData: FormData) => void | Promise<unknown>;
  updateMemberRoleAction: (formData: FormData) => void | Promise<unknown>;
  removeMemberAction: (formData: FormData) => void | Promise<unknown>;
  revokeInvitationAction: (formData: FormData) => void | Promise<unknown>;
};

export function ManagePeopleModal({
  boardId,
  isBoardOwner,
  members,
  invitations,
  inviteAction,
  updateMemberRoleAction,
  removeMemberAction,
  revokeInvitationAction,
}: ManagePeopleModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");
  const submitInviteAction = async (formData: FormData) => {
    await inviteAction(formData);
  };
  const submitUpdateMemberRoleAction = async (formData: FormData) => {
    await updateMemberRoleAction(formData);
  };
  const submitRemoveMemberAction = async (formData: FormData) => {
    await removeMemberAction(formData);
  };
  const submitRevokeInvitationAction = async (formData: FormData) => {
    await revokeInvitationAction(formData);
  };

  function lockBodyScroll() {
    document.body.style.overflow = "hidden";
  }

  function unlockBodyScroll() {
    document.body.style.overflow = "";
  }

  function openModal() {
    setActiveTab("members");
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
        className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
      >
        Manage people
      </button>

      <dialog
        ref={dialogRef}
        onClose={unlockBodyScroll}
        onClick={onBackdropClick}
        className="fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(56rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-xl backdrop:bg-black/60"
      >
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">People</h3>
              <p className="text-sm text-zinc-400">Manage board members and invitations.</p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-900"
            >
              Close
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                activeTab === "members"
                  ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              Members ({members.length})
            </button>
            {isBoardOwner ? (
              <button
                type="button"
                onClick={() => setActiveTab("invitations")}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  activeTab === "invitations"
                    ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                    : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                Invitations ({invitations.length})
              </button>
            ) : null}
          </div>

          {activeTab === "members" ? (
            <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
              {members.length === 0 ? (
                <p className="text-sm text-zinc-400">No members yet.</p>
              ) : (
                members.map((member) => {
                  const canManage = isBoardOwner && member.role !== "owner" && !member.isCurrentUser;

                  return (
                    <div key={member.userId} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-200">
                          {member.name} {member.isCurrentUser ? "(You)" : ""}
                        </p>
                        <span className="rounded border border-zinc-700 px-2 py-0.5 text-xs capitalize text-zinc-300">
                          {member.role}
                        </span>
                      </div>

                      {canManage ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <form action={submitUpdateMemberRoleAction} className="flex items-center gap-2">
                            <input type="hidden" name="board_id" value={boardId} />
                            <input type="hidden" name="target_user_id" value={member.userId} />
                            <select
                              name="role"
                              defaultValue={member.role}
                              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 pr-8 text-xs outline-none focus:border-zinc-500"
                            >
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800"
                            >
                              Update role
                            </button>
                          </form>

                          <form action={submitRemoveMemberAction}>
                            <input type="hidden" name="board_id" value={boardId} />
                            <input type="hidden" name="target_user_id" value={member.userId} />
                            <button
                              type="submit"
                              className="rounded-md border border-red-700 px-2.5 py-1.5 text-xs text-red-300 transition hover:bg-red-950/60"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isBoardOwner ? (
                <form action={submitInviteAction} className="grid gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-3 sm:grid-cols-[1fr_auto_auto]">
                  <input type="hidden" name="board_id" value={boardId} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Invite by email"
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  />
                  <select
                    name="role"
                    defaultValue="member"
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 pr-10 text-sm outline-none focus:border-zinc-500"
                  >
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
                  >
                    Send invite
                  </button>
                </form>
              ) : null}

              <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
                {invitations.length === 0 ? (
                  <p className="text-sm text-zinc-400">No pending invites.</p>
                ) : (
                  invitations.map((invitation) => (
                    <div key={invitation.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-sm text-zinc-200">{invitation.email}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Role: <span className="capitalize">{invitation.role}</span> - expires{" "}
                        {new Date(invitation.expiresAt).toISOString().slice(0, 10)}
                      </p>
                      {isBoardOwner ? (
                        <form action={submitRevokeInvitationAction} className="mt-2">
                          <input type="hidden" name="board_id" value={boardId} />
                          <input type="hidden" name="invitation_id" value={invitation.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800"
                          >
                            Revoke
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
