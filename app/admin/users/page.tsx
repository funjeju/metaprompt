import { getTranslations } from "next-intl/server";
import { DataTable } from "@/components/admin/widgets";
import { listUsers } from "@/lib/admin/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin");
  const rows = await listUsers();

  return (
    <section className="mx-auto w-full max-w-5xl px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("nav.users")}</h1>
      <div className="mt-6">
        <DataTable
          columns={[
            t("col.email"),
            t("col.name"),
            t("col.role"),
            t("col.plan"),
            t("col.lastLogin"),
          ]}
          rows={rows.map((u) => [
            u.email ?? "—",
            u.displayName ?? "—",
            u.role,
            u.planTier,
            u.lastLoginMs ? new Date(u.lastLoginMs).toLocaleString() : "—",
          ])}
          empty={t("empty")}
        />
      </div>
    </section>
  );
}
