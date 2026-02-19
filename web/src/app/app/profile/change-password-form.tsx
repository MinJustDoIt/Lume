"use client";

import { FormEvent, useState } from "react";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setMessage("Password updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block space-y-2">
        <span className="text-sm text-zinc-300">New password</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-zinc-300">Confirm password</span>
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </label>

      {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Updating..." : "Change password"}
      </button>
    </form>
  );
}
