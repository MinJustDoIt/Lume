"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AccountMenuProps = {
  userEmail: string;
};

export function AccountMenu({ userEmail }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
    setIsSigningOut(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open account menu"
        className="rounded-md border border-zinc-700 p-1.5 text-zinc-200 transition hover:bg-zinc-900"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
          <p className="px-2 py-1 text-xs text-zinc-500">{userEmail}</p>
          <Link
            href="/app/profile"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-md px-2 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
          >
            Profile settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-1 w-full rounded-md px-2 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
