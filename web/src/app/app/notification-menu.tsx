"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InboxRealtimeListener } from "./inbox-realtime-listener";

type NotificationItem = {
  id: string;
  message: string;
  meta: string;
  href: string | null;
  queuedAt: string;
};

type NotificationMenuProps = {
  userId: string;
  items: NotificationItem[];
  dismissAction: (formData: FormData) => void | Promise<void>;
};

export function NotificationMenu({ userId, items, dismissAction }: NotificationMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={wrapperRef} className="relative">
      <InboxRealtimeListener userId={userId} />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md border border-zinc-700 p-1.5 text-zinc-200 transition hover:bg-zinc-900"
        aria-label="Open notifications"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18v12H3z" />
          <path d="M3 7l9 7 9-7" />
        </svg>
        {items.length > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
          <div className="border-b border-zinc-800 px-2 pb-2">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Inbox</p>
          </div>
          <div className="max-h-80 overflow-y-auto pt-2">
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-zinc-400">No new notifications.</p>
            ) : (
              items.map((notification) => (
                <div key={notification.id} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
                  <p className="text-sm text-zinc-200">{notification.message}</p>
                  <p className="mt-1 text-xs text-zinc-400">{notification.meta}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(notification.queuedAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        onClick={() => setOpen(false)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-100 transition hover:bg-zinc-800"
                      >
                        Open
                      </Link>
                    ) : null}
                    <form action={dismissAction}>
                      <input type="hidden" name="notification_id" value={notification.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-100 transition hover:bg-zinc-800"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
