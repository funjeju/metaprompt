"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// DECISION: 쿠키 기반 locale (i18n/request.ts). 토글 시 쿠키 저장 후 새로고침.
const LOCALES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "EN" },
] as const;

const LOCALE_COOKIE = "NEXT_LOCALE";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(code: string) {
    if (code === locale) return;
    // 1년 유지.
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-surface p-0.5"
      role="group"
      aria-label="language"
    >
      {LOCALES.map((l) => {
        const active = locale === l.code;
        return (
          <button
            key={l.code}
            type="button"
            disabled={pending}
            onClick={() => setLocale(l.code)}
            aria-pressed={active}
            className={`rounded-pill px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
              active ? "bg-accent text-white" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
