import { getTranslations } from "next-intl/server";
import { DataTable } from "@/components/admin/widgets";
import { getAdminOverview } from "@/lib/admin/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUsagePage() {
  const t = await getTranslations("admin");
  const s = await getAdminOverview();
  const num = (n: number) => n.toLocaleString();

  return (
    <section className="mx-auto w-full max-w-5xl px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("nav.usage")}</h1>
      <p className="mt-2 text-xs text-faint">
        {t("windowNote")} · {t("estCostNote")}
      </p>
      <div className="mt-6">
        <DataTable
          columns={[
            t("col.model"),
            t("col.calls"),
            t("col.inTokens"),
            t("col.outTokens"),
            t("col.cost"),
          ]}
          rows={s.byModel.map((m) => [
            m.model,
            num(m.calls),
            num(m.input),
            num(m.output),
            `$${m.costUsd.toFixed(2)}`,
          ])}
          empty={t("empty")}
        />
      </div>
    </section>
  );
}
