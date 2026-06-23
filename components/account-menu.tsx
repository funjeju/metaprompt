"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";

// 헤더 우측 계정 메뉴. 로그인 상태/어드민 여부에 따라 링크가 달라진다.
export function AccountMenu() {
  const t = useTranslations("nav");
  const { user, loading, configured, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // admin 커스텀 클레임 확인 (어드민 링크 노출용).
  useEffect(() => {
    let active = true;
    if (user) {
      user.getIdTokenResult().then((r) => {
        if (active) setIsAdmin(r.claims.admin === true);
      });
    } else {
      setIsAdmin(false);
    }
    return () => {
      active = false;
    };
  }, [user]);

  // 바깥 클릭 닫기.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!configured) return null; // Firebase 미설정 시 계정 UI 숨김
  if (loading) {
    return <div className="h-8 w-8 rounded-pill bg-surface-2" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-pill bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
      >
        {t("login")}
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-pill border border-border bg-surface text-xs font-semibold text-ink"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
        ) : (
          (user.displayName || user.email || "?").charAt(0).toUpperCase()
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          <MenuLink href="/history" onClick={() => setOpen(false)}>
            {t("history")}
          </MenuLink>
          <MenuLink href="/settings" onClick={() => setOpen(false)}>
            {t("settings")}
          </MenuLink>
          {isAdmin && (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              {t("admin")}
            </MenuLink>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
            }}
            className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-surface-2"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-4 py-2 text-sm text-ink hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}
