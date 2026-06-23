import { getTranslations } from "next-intl/server";
import { DataTable } from "@/components/admin/widgets";
import { listSessions } from "@/lib/admin/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const t = await getTranslations("admin");
  const rows = await listSessions();

  return (
    <section className="mx-auto w-full max-w-5xl px-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("nav.sessions")}
      </h1>
      <div className="mt-6">
        <DataTable
          columns={[t("col.input"), t("col.module"), t("col.user"), t("col.createdAt")]}
          rows={rows.map((s) => [
            s.inputText.length > 60 ? s.inputText.slice(0, 60) + "…" : s.inputText,
            s.routedModule ?? "—",
            s.uid ? s.uid.slice(0, 8) : "guest",
            s.createdMs ? new Date(s.createdMs).toLocaleString() : "—",
          ])}
          empty={t("empty")}
        />
      </div>
    </section>
  );
}
