"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SiteHeader } from "@/components/site-header";

export default function LandingPage() {
  const t = useTranslations("landing");
  const tb = useTranslations("brand");
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit() {
    const text = value.trim();
    if (!text) return;
    router.push(`/generate?q=${encodeURIComponent(text)}`);
  }

  return (
    <main className="min-h-dvh">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-16 text-center sm:pt-24">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-4 max-w-xl text-sm text-muted sm:text-base">
          {t("subheading")}
        </p>

        {/* 시그니처 그라데이션을 두른 입력 카드 — 핵심 1곳 (docs/06 6.1) */}
        <div className="mt-10 w-full rounded-xl bg-brand p-[2px] shadow-lg">
          <div className="rounded-[30px] bg-surface p-3">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              rows={3}
              placeholder={t("placeholder")}
              className="w-full resize-none bg-transparent px-3 py-2 text-base text-ink placeholder:text-faint focus:outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-xs text-faint">⌘/Ctrl + Enter</span>
              <button
                type="button"
                onClick={submit}
                disabled={!value.trim()}
                className="rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {t("cta")}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-12 text-xs text-faint">{tb("tagline")}</p>
      </section>
    </main>
  );
}
