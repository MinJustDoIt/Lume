"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function fallbackNameFromEmail(email: string | null | undefined) {
  if (!email) return "Someone";
  const base = email.split("@")[0]?.trim();
  return base || "Someone";
}

export async function createWorkspaceAction(formData: FormData) {
  const name = readString(formData, "name");
  if (!name) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) return;

  revalidatePath("/app");
  redirect(`/app?workspace=${data.id}`);
}

export async function createBoardAction(formData: FormData) {
  const workspaceId = readString(formData, "workspace_id");
  const name = readString(formData, "name");
  const description = readString(formData, "description");

  if (!workspaceId || !name) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.from("boards").insert({
    workspace_id: workspaceId,
    name,
    description,
    created_by: user.id,
  });

  if (error) return;

  revalidatePath("/app");
  redirect(`/app?workspace=${workspaceId}`);
}

export async function acceptInvitationAction(formData: FormData) {
  const invitationId = readString(formData, "invitation_id");
  if (!invitationId) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userEmail = normalizeEmail(user.email ?? "");
  if (!userEmail) return;

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, board_id, email, role, status, expires_at, invited_by")
    .eq("id", invitationId)
    .maybeSingle();

  if (!invitation || invitation.status !== "pending") return;
  if (normalizeEmail(invitation.email) !== userEmail) return;

  if (new Date(invitation.expires_at).getTime() <= Date.now()) return;

  const { data: existingMembership } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", invitation.board_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMembership) {
    const { error: insertMembershipError } = await supabase.from("board_members").insert({
      board_id: invitation.board_id,
      user_id: user.id,
      role: invitation.role,
      added_by: invitation.invited_by,
    });

    if (insertMembershipError) return;
  }

  const { error: updateInvitationError } = await supabase
    .from("invitations")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  if (updateInvitationError) return;

  if (invitation.invited_by) {
    const actorName = fallbackNameFromEmail(user.email);
    await supabase.from("notification_events").insert({
      user_id: invitation.invited_by,
      board_id: invitation.board_id,
      event_type: "invitation.accepted",
      payload: {
        invitation_id: invitation.id,
        accepted_by: user.id,
        actor_name: actorName,
      },
    });
  }

  revalidatePath("/app");
  revalidatePath(`/app/boards/${invitation.board_id}`);
  redirect(`/app/boards/${invitation.board_id}`);
}

export async function dismissNotificationAction(formData: FormData) {
  const notificationId = readString(formData, "notification_id");
  if (!notificationId) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase
    .from("notification_events")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/app");
}

export async function updateProfileNameAction(formData: FormData) {
  const fullName = readString(formData, "full_name");
  if (!fullName) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);

  revalidatePath("/app");
  revalidatePath("/app/profile");
}
