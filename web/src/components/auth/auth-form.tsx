"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();

      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;
        router.push("/auth/login?registered=1");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/app");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {mode === "login" ? "Welcome back to Lume." : "Get started with your first workspace."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {isRegister ? (
          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Full name</span>
            <input
              type="text"
              required
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
              placeholder="Your name"
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
            placeholder="you@example.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
            placeholder="Minimum 6 characters"
          />
        </label>

        {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-sm text-zinc-400">
        {mode === "login" ? "Need an account?" : "Already registered?"}{" "}
        <Link
          href={mode === "login" ? "/auth/register" : "/auth/login"}
          className="text-zinc-100 underline underline-offset-2"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
