import { getTranslations } from "next-intl/server";
import { StatCard, MiniBars } from "@/components/admin/widgets";
import { getAdminOverview } from "@/lib/admin/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const t = await getTranslations("admin");
  const s = await getAdminOverview();

  if (!s.configured) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4">
        <p className="rounded-lg border border-border bg-surface p-6 text-sm text-warning shadow-card">
          {t("notConfigured")}
        </p>
      </section>
    );
  }

  const usd = (n: number) => `$${n.toFixed(2)}`;
  const num = (n: number) => n.toLocaleString();

  return (
    <section className="mx-auto w-full max-w-5xl px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      {/* 접속 통계 */}
      <h2 className="mt-8 text-sm font-semibold text-muted">{t("access")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t("dau")} value={num(s.activeToday)} accentIndex={0} />
        <StatCard label={t("wau")} value={num(s.activeWeek)} accentIndex={1} />
        <StatCard label={t("mau")} value={num(s.activeMonth)} accentIndex={2} />
        <StatCard label={t("generates")} value={num(s.generates)} accentIndex={3} />
      </div>
      <div className="mt-4">
        <MiniBars data={s.dailyActive} title={t("dailyActive")} />
      </div>

      {/* 이용자 / 세션 */}
      <h2 className="mt-8 text-sm font-semibold text-muted">{t("usersSessions")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t("users")} value={num(s.users)} accentIndex={1} />
        <StatCard label={t("sessions")} value={num(s.sessions)} accentIndex={0} />
      </div>

      {/* 사용량 / 원가 */}
      <h2 className="mt-8 text-sm font-semibold text-muted">{t("usageCost")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t("llmCalls")} value={num(s.llmCalls)} accentIndex={0} />
        <StatCard
          label={t("tokens")}
          value={num(s.tokensInput + s.tokensOutput)}
          sub={`in ${num(s.tokensInput)} · out ${num(s.tokensOutput)}`}
          accentIndex={1}
        />
        <StatCard
          label={t("estCost")}
          value={usd(s.estCostUsd)}
          sub={t("estCostNote")}
          accentIndex={2}
        />
        <StatCard
          label={t("avgLatency")}
          value={`${num(s.avgLatencyMs)} ms`}
          accentIndex={3}
        />
      </div>
      <p className="mt-6 text-xs text-faint">{t("windowNote")}</p>
    </section>
  );
}
