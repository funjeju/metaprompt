import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SessionRow {
  id: string;
  inputText: string;
  routedModule: string | null;
  finalPrompt: string | null;
  createdAtMs: number | null;
}

async function loadSessions(uid: string): Promise<SessionRow[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection("sessions")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt;
      return {
        id: d.id,
        inputText: data.inputText ?? "",
        routedModule: data.routedModule ?? null,
        finalPrompt: data.finalPrompt ?? null,
        createdAtMs:
          createdAt && typeof createdAt.toMillis === "function"
            ? createdAt.toMillis()
            : null,
      };
    });
  } catch (err) {
    console.warn("[/history] 조회 실패:", err);
    return [];
  }
}

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/history");

  const t = await getTranslations("history");
  const rows = await loadSessions(user.uid);

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <section className="mx-auto w-full max-w-2xl px-4 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

        {rows.length === 0 ? (
          <p className="mt-8 rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted shadow-card">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-surface p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium text-ink">{r.inputText}</p>
                  {r.routedModule && (
                    <span className="shrink-0 rounded-pill bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                      {r.routedModule}
                    </span>
                  )}
                </div>
                {r.finalPrompt && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {r.finalPrompt}
                  </p>
                )}
                {r.createdAtMs && (
                  <p className="mt-2 text-xs text-faint">
                    {new Date(r.createdAtMs).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
