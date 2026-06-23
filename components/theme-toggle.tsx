"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

// docs/04 4.5 — 라이트/다크/시스템 3-state 세그먼트 토글.
const OPTIONS = ["light", "dark", "system"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // SSR/CSR 불일치 방지: 마운트 전엔 자리만 차지.
  if (!mounted) {
    return <div className="h-8 w-[132px] rounded-pill bg-surface-2" aria-hidden />;
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-surface p-0.5"
      role="group"
      aria-label="theme"
    >
      {OPTIONS.map((opt) => {
        const active = (theme ?? "system") === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setTheme(opt)}
            aria-pressed={active}
            className={`rounded-pill px-2.5 py-1 text-xs font-medium transition ${
              active
                ? "bg-accent text-white"
                : "text-muted hover:text-ink"
            }`}
          >
            {t(opt)}
          </button>
        );
      })}
    </div>
  );
}
