import Link from "next/link";
import { acceptInvitationAction, createWorkspaceAction, createBoardAction } from "./actions";
import { CreateBoardModal } from "@/components/boards";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type Workspace = {
  id: string;
  name: string;
  created_at: string;
};

type Board = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  updated_at: string;
};

type PendingInvitation = {
  id: string;
  board_id: string;
  email: string;
  role: "member" | "viewer";
  expires_at: string;
  created_at: string;
};

type AppHomePageProps = {
  searchParams: Promise<{ workspace?: string }>;
};

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const { workspace: workspaceQuery } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  const workspaceList = (workspaces ?? []) as Workspace[];
  const selectedWorkspaceId =
    workspaceList.find((item) => item.id === workspaceQuery)?.id ?? workspaceList[0]?.id ?? null;

  let boards: Board[] = [];
  if (selectedWorkspaceId) {
    const { data } = await supabase
      .from("boards")
      .select("id, workspace_id, name, description, updated_at")
      .eq("workspace_id", selectedWorkspaceId)
      .order("updated_at", { ascending: false });
    boards = (data ?? []) as Board[];
  }

  let sharedBoards: Board[] = [];
  if (user?.id) {
    const { data: memberships } = await supabase.from("board_members").select("board_id").eq("user_id", user.id);
    const memberBoardIds = Array.from(new Set((memberships ?? []).map((row) => String(row.board_id))));

    if (memberBoardIds.length > 0) {
      const { data: memberBoards } = await supabase
        .from("boards")
        .select("id, workspace_id, name, description, updated_at")
        .in("id", memberBoardIds)
        .order("updated_at", { ascending: false });

      const ownWorkspaceIds = new Set(workspaceList.map((workspace) => workspace.id));
      sharedBoards = ((memberBoards ?? []) as Board[]).filter((board) => !ownWorkspaceIds.has(board.workspace_id));
    }
  }

  const { data: pendingInvitations } = await supabase
    .from("invitations")
    .select("id, board_id, email, role, expires_at, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const invitationRows = (pendingInvitations ?? []) as PendingInvitation[];

  return (
    <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Workspaces</p>
          <h2 className="mt-1 text-lg font-semibold">Your workspaces</h2>
        </div>

        <form action={createWorkspaceAction} className="space-y-2">
          <input
            name="name"
            required
            maxLength={120}
            placeholder="New workspace name"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Create workspace
          </button>
        </form>

        <div className="h-px w-full bg-zinc-800" />

        <div className="space-y-1">
          {workspaceList.length === 0 ? (
            <p className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
              No workspace yet. Create one to continue.
            </p>
          ) : (
            workspaceList.map((workspace) => {
              const isActive = workspace.id === selectedWorkspaceId;
              return (
                <Link
                  key={workspace.id}
                  href={`/app?workspace=${workspace.id}`}
                  className={`block rounded-md border px-3 py-2 text-sm transition ${
                    isActive
                      ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  {workspace.name}
                </Link>
              );
            })
          )}
        </div>
      </aside>

      <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        {invitationRows.length > 0 ? (
          <div className="space-y-2 rounded-md border border-zinc-700 bg-zinc-950 p-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Invitations</p>
              <h2 className="mt-1 text-base font-semibold">Pending invites</h2>
            </div>
            <div className="space-y-2">
              {invitationRows.map((invitation) => (
                <div key={invitation.id} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
                  <p className="text-sm text-zinc-200">
                    Role: <span className="capitalize">{invitation.role}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Board {invitation.board_id.slice(0, 8)}... - expires {new Date(invitation.expires_at).toISOString().slice(0, 10)}
                  </p>
                  <form action={acceptInvitationAction} className="mt-2">
                    <input type="hidden" name="invitation_id" value={invitation.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800"
                    >
                      Accept invitation
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Boards</p>
            <h2 className="mt-1 text-lg font-semibold">Workspace boards</h2>
          </div>
          {selectedWorkspaceId ? (
            <CreateBoardModal workspaceId={selectedWorkspaceId} action={createBoardAction} />
          ) : null}
        </div>

        {!selectedWorkspaceId ? (
          <p className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
            Select or create a workspace to add boards.
          </p>
        ) : boards.length === 0 ? (
          <p className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
            No boards in this workspace yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/app/boards/${board.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <h3 className="text-base font-medium">{board.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{board.description || "No description."}</p>
                <p className="mt-3 text-xs text-zinc-500">
                  Updated {new Date(board.updated_at).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        )}

        {sharedBoards.length > 0 ? (
          <>
            <div className="h-px w-full bg-zinc-800" />
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Shared</p>
              <h2 className="mt-1 text-lg font-semibold">Boards shared with you</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sharedBoards.map((board) => (
                <Link
                  key={`shared-${board.id}`}
                  href={`/app/boards/${board.id}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <h3 className="text-base font-medium">{board.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{board.description || "No description."}</p>
                  <p className="mt-3 text-xs text-zinc-500">Updated {new Date(board.updated_at).toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
