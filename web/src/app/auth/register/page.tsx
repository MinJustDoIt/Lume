import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export default async function RegisterPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <AuthForm mode="register" />
    </main>
  );
}
