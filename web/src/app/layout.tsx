import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lume Task Management",
  description: "Collaborative task management for modern teams.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem("lume-theme");var theme=(stored==="light"||stored==="dark")?stored:"dark";var root=document.documentElement;root.classList.toggle("theme-light",theme==="light");root.style.colorScheme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
