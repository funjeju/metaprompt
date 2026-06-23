"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { SiteHeader } from "@/components/site-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const locale = useLocale();

  // 미로그인 가드.
  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/settings");
  }, [loading, user, router]);

  // 테마/언어 변경을 Firestore에 best-effort 영속화 (docs/03 users.theme/locale).
  useEffect(() => {
    if (!user) return;
    fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: theme ?? "system", locale }),
    }).catch(() => {});
  }, [user, theme, locale]);

  if (loading || !user) {
    return (
      <main className="min-h-dvh">
        <SiteHeader />
        <div className="py-24 text-center text-muted">…</div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <section className="mx-auto w-full max-w-xl px-4 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

        {/* 계정 */}
        <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">
            {t("account")}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-pill bg-surface-2">
              {user.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <p className="font-medium text-ink">{user.displayName ?? "—"}</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>
        </div>

        {/* 모양 */}
        <div className="mt-4 rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{t("theme")}</span>
            <ThemeToggle />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{t("language")}</span>
            <LanguageToggle />
          </div>
        </div>

        {/* 로그아웃 */}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          className="mt-6 rounded-pill border border-border bg-surface px-5 py-2.5 text-sm font-medium text-danger transition hover:border-danger"
        >
          {t("logout")}
        </button>
      </section>
    </main>
  );
}
