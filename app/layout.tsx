import "../styles/globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Math App",
  description:
    "Math App Flash Cards built with Next.js, Tailwind, and TypeScript",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div className="pointer-events-none fixed left-1 top-1/2 z-50 -translate-y-1/2 px-1">
          <p className="pointer-events-auto rounded-full border border-white/10 bg-black/10 px-1.5 py-2 text-[9px] text-white/60 backdrop-blur-sm [writing-mode:vertical-rl] dark:border-white/5 dark:bg-slate-900/20 dark:text-white/50">
            Criado por{" "}
            <a
              href="https://guiflores.dev"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline decoration-white/30 underline-offset-2 transition-colors hover:text-white/80"
            >
              guiflores.dev
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
