"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { AccountMenu } from "./account-menu";

export function SiteHeader() {
  const t = useTranslations("brand");
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="inline-block h-6 w-6 rounded-md bg-brand" aria-hidden />
        <span className="text-base font-semibold tracking-tight">
          {t("name")}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
