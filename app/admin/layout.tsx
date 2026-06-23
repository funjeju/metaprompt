import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { getSessionUser } from "@/lib/firebase/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /admin/* 가드 — Firebase Custom Claim admin==true 만 통과 (docs/03 3.3).
// 미들웨어(Edge)가 아니라 여기서 검증한다(firebase-admin 은 Node 전용).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.admin) redirect("/");

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <AdminNav />
      <div className="pt-4">{children}</div>
    </main>
  );
}
