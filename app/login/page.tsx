"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";

function LoginInner() {
  const t = useTranslations("auth");
  const { user, loading, configured, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  // 로그인되면 원래 가려던 곳으로.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 pt-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted">{t("subtitle")}</p>

        {!configured ? (
          <p className="mt-10 rounded-md border border-border bg-surface px-4 py-3 text-sm text-warning">
            {t("notConfigured")}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={loading}
            className="mt-10 flex w-full items-center justify-center gap-2 rounded-pill border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink shadow-card transition hover:border-accent disabled:opacity-50"
          >
            <GoogleMark />
            {t("google")}
          </button>
        )}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
