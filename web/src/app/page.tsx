import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-6">
      <p className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300">
        Lume
      </p>
      <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
        Task management built for focused teams
      </h1>
      <p className="max-w-2xl text-center text-zinc-400">
        Use workspaces, boards, lists, and tasks to plan and ship work together in real time.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/auth/register"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
        >
          Create account
        </Link>
        <Link
          href="/auth/login"
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900"
        >
          Sign in
        </Link>
        <Link
          href="/app"
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900"
        >
          Go to app
        </Link>
      </div>
    </main>
  );
}
