import Link from "next/link";
import { redirect } from "next/navigation";
import { dismissNotificationAction } from "./actions";
import { AccountMenu } from "./account-menu";
import { NotificationMenu } from "./notification-menu";
import { ThemeToggle } from "../theme-toggle";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type NotificationPayload = Record<string, unknown> | null;

function readPayloadString(payload: NotificationPayload, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function buildNotificationPresentation(input: {
  eventType: string;
  boardId: string | null;
  boardName: string;
  payload: NotificationPayload;
}) {
  const actorName = readPayloadString(input.payload, "actor_name") || "Someone";
  const taskId = readPayloadString(input.payload, "task_id");
  const taskTitle = readPayloadString(input.payload, "task_title") || "task";
  const commentPreview = readPayloadString(input.payload, "comment_preview");
  const email = readPayloadString(input.payload, "email");
  const role = readPayloadString(input.payload, "role");
  const emoji = readPayloadString(input.payload, "emoji");

  const href = input.boardId ? (taskId ? `/app/boards/${input.boardId}?task=${taskId}` : `/app/boards/${input.boardId}`) : null;

  if (input.eventType === "comment.reacted") {
    return {
      href,
      message: `${actorName} reacted to your comment`,
      meta: `${input.boardName} - ${taskTitle}${emoji ? ` - ${emoji}` : ""}`,
    };
  }

  if (input.eventType === "comment.reply_received") {
    return {
      href,
      message: `${actorName} replied to your comment`,
      meta: `${input.boardName} - ${taskTitle}${commentPreview ? ` - "${commentPreview}"` : ""}`,
    };
  }

  if (input.eventType === "comment.added" || input.eventType === "comment.reply_added") {
    return {
      href,
      message: `${actorName} added a comment`,
      meta: `${input.boardName} - ${taskTitle}${commentPreview ? ` - "${commentPreview}"` : ""}`,
    };
  }

  if (input.eventType === "comment.updated" || input.eventType === "comment.deleted") {
    return {
      href,
      message: `${actorName} ${input.eventType === "comment.updated" ? "updated" : "deleted"} a comment`,
      meta: `${input.boardName} - ${taskTitle}`,
    };
  }

  if (input.eventType === "task.created" || input.eventType === "task.updated") {
    return {
      href,
      message: `${actorName} ${input.eventType === "task.created" ? "created" : "updated"} a card`,
      meta: `${input.boardName} - ${taskTitle}`,
    };
  }

  if (input.eventType === "invitation.sent" || input.eventType === "invitation.updated") {
    return {
      href,
      message: `${actorName} ${input.eventType === "invitation.sent" ? "invited" : "updated invite for"} ${email || "a user"}`,
      meta: `${input.boardName}${role ? ` - ${role}` : ""}`,
    };
  }

  if (input.eventType === "invitation.accepted") {
    return {
      href,
      message: `${actorName} accepted an invitation`,
      meta: input.boardName,
    };
  }

  if (input.eventType === "membership.role_updated") {
    return {
      href,
      message: "Your board role was updated",
      meta: `${input.boardName}${role ? ` - ${role}` : ""}`,
    };
  }

  if (input.eventType === "membership.removed") {
    return {
      href: input.boardId ? `/app` : null,
      message: "You were removed from a board",
      meta: input.boardName,
    };
  }

  return {
    href,
    message: input.eventType.replaceAll(".", " "),
    meta: input.boardName,
  };
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: notifications } = await supabase
    .from("notification_events")
    .select("id, board_id, event_type, payload, status, queued_at")
    .eq("status", "queued")
    .order("queued_at", { ascending: false })
    .limit(20);

  const notificationRows = (notifications ?? []) as Array<{
    id: string;
    board_id: string | null;
    event_type: string;
    payload: NotificationPayload;
    status: "queued" | "sent" | "failed";
    queued_at: string;
  }>;

  const notificationBoardIds = Array.from(
    new Set(notificationRows.map((item) => item.board_id).filter((id): id is string => Boolean(id)))
  );
  const boardNameMap = new Map<string, string>();
  if (notificationBoardIds.length > 0) {
    const { data: notificationBoards } = await supabase.from("boards").select("id, name").in("id", notificationBoardIds);
    for (const board of notificationBoards ?? []) {
      boardNameMap.set(String(board.id), String(board.name));
    }
  }

  const notificationItems = notificationRows.map((row) => {
    const boardName = row.board_id ? boardNameMap.get(row.board_id) ?? "Board" : "General";
    const present = buildNotificationPresentation({
      eventType: row.event_type,
      boardId: row.board_id,
      boardName,
      payload: row.payload,
    });

    return {
      id: row.id,
      message: present.message,
      meta: present.meta,
      href: present.href,
      queuedAt: row.queued_at,
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/app" className="font-semibold tracking-tight">
              Lume
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-400">
              <span>Boards</span>
              <span>Tasks</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationMenu userId={user.id} items={notificationItems} dismissAction={dismissNotificationAction} />
            <AccountMenu userEmail={user.email ?? ""} />
          </div>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl flex-col p-4">{children}</main>
    </div>
  );
}
