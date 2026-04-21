"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const operations = [
  { name: "Adição", value: "addition", shortcut: 1 as const },
  { name: "Subtração", value: "subtraction", shortcut: 2 as const },
  { name: "Multiplicação", value: "multiplication", shortcut: 3 as const },
  { name: "Divisão", value: "division", shortcut: 4 as const },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export default function Home() {
  const router = useRouter();

  const goToOperation = useCallback(
    (value: string) => {
      router.push(`/practice?operation=${value}`);
    },
    [router],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");

    const onKeyDown = (event: KeyboardEvent) => {
      if (!mq.matches) return;
      if (event.repeat) return;
      if (event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;

      let digit: number | null = null;
      if (event.code.startsWith("Digit")) {
        digit = Number.parseInt(event.code.slice("Digit".length), 10);
      } else if (event.code.startsWith("Numpad")) {
        digit = Number.parseInt(event.code.slice("Numpad".length), 10);
      }
      if (digit === null || digit < 1 || digit > 4) return;

      event.preventDefault();
      const op = operations[digit - 1];
      if (op) goToOperation(op.value);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToOperation]);

  return (
    <div
      className="relative h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col items-stretch
        bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-400 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950
        px-3 pt-11 pb-3 sm:px-4 sm:pt-14 sm:pb-4 transition-colors duration-300"
    >
      <div className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-col flex-1 min-h-0 w-full max-w-xl sm:max-w-2xl mx-auto items-center">
        <h1 className="shrink-0 text-lg sm:text-3xl md:text-4xl text-white font-bold mb-1 sm:mb-2 text-center drop-shadow-sm leading-tight px-1">
          Praticar Matemática
        </h1>
        <p className="hidden md:block shrink-0 text-white/90 text-sm mb-4 text-center">
          No desktop, use as teclas{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-semibold">
            1
          </kbd>
          {" – "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-semibold">
            4
          </kbd>{" "}
          para ir direto.
        </p>

        <div className="flex-1 min-h-0 w-full grid grid-cols-2 grid-rows-2 gap-2 sm:gap-4 md:gap-5">
          {operations.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => goToOperation(op.value)}
              aria-label={`${op.name}, atalho tecla ${op.shortcut}`}
              className="group relative min-h-0 min-w-0 h-full w-full flex flex-col items-center justify-center
                gap-1 sm:gap-2 md:gap-3 rounded-xl sm:rounded-2xl px-1 py-1.5 sm:px-2 sm:py-3
                border border-white/40 dark:border-white/20
                bg-white/25 dark:bg-slate-900/45
                backdrop-blur-xl shadow-lg shadow-black/10 dark:shadow-black/40
                text-white font-semibold text-[0.65rem] leading-tight sm:text-xs md:text-lg lg:text-2xl
                transition-all duration-200 ease-out
                hover:scale-[1.02] hover:border-white/60 dark:hover:border-white/35
                hover:bg-white/35 dark:hover:bg-slate-800/55 hover:shadow-2xl
                active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <span
                className="flex h-7 w-7 shrink-0 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-full
                  bg-white/35 dark:bg-white/15 border border-white/50 dark:border-white/25
                  text-xs sm:text-lg md:text-xl font-bold shadow-inner
                  group-hover:bg-white/45 dark:group-hover:bg-white/20 transition-colors"
                aria-hidden
              >
                {op.shortcut}
              </span>
              <span className="px-0.5 text-center leading-snug line-clamp-2 sm:line-clamp-none">
                {op.name}
              </span>
              <span className="hidden md:flex absolute bottom-1.5 sm:bottom-2 md:bottom-3 items-center gap-1 text-[10px] sm:text-xs font-medium text-white/80">
                <kbd className="rounded px-1 py-0.5 bg-black/15 dark:bg-black/30 border border-white/25 font-mono">
                  {op.shortcut}
                </kbd>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
