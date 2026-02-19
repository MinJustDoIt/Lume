import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfileNameAction } from "../actions";
import { ChangePasswordForm } from "./change-password-form";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const fullName = typeof profile?.full_name === "string" ? profile.full_name : "";

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Account</p>
          <h1 className="mt-1 text-xl font-semibold">Profile settings</h1>
        </div>
        <Link
          href="/app"
          className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
        >
          Back to app
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-300">
          <span className="text-zinc-400">User ID:</span> {user.id}
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          <span className="text-zinc-400">Email:</span> {user.email}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-base font-semibold">Update name</h2>
        <form action={updateProfileNameAction} className="mt-3 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Full name</span>
            <input
              name="full_name"
              required
              maxLength={120}
              defaultValue={fullName}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900"
          >
            Save name
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-base font-semibold">Change password</h2>
        <div className="mt-3">
          <ChangePasswordForm />
        </div>
      </div>
    </section>
  );
}
