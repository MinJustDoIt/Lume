"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem("lume-theme");
  return stored === "light" || stored === "dark" ? stored : "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("theme-light", theme === "light");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function onToggle() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem("lume-theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-900"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
