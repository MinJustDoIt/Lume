"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/browser";

type InboxRealtimeListenerProps = {
  userId: string;
};

export function InboxRealtimeListener({ userId }: InboxRealtimeListenerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`notification-inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_events",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 15000);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
