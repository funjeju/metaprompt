"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const ITEMS = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/sessions", key: "sessions" },
  { href: "/admin/usage", key: "usage" },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-1 px-4 pb-2">
      {ITEMS.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-accent text-white"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
