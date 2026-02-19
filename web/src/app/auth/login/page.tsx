import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ registered?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ registered }, supabase] = await Promise.all([searchParams, createServerSupabaseClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {registered === "1" ? (
          <p className="mb-4 rounded-md border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300">
            Account created. Sign in to continue.
          </p>
        ) : null}
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
