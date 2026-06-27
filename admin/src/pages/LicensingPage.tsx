import { PageHeader, Panel, Stat } from "../components/ui";
import { getLicensing } from "../lib/api";
import { useAdminData } from "../lib/use-admin-data";

export function LicensingPage() {
  const lic = useAdminData(getLicensing);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licensing & Billing"
        subtitle="License inventory across all tenants."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Licenses" value={lic.kind === "ok" ? String(lic.data.total) : "—"} />
        <Stat label="Active" value={lic.kind === "ok" ? String(lic.data.active) : "—"} />
        <Stat
          label="Tiers"
          value={lic.kind === "ok" ? String(new Set(lic.data.by_tier.map((t) => t.tier)).size) : "—"}
        />
      </section>

      <Panel title="By tier">
        {lic.kind === "loading" ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : lic.kind === "error" ? (
          <div className="text-sm">
            <p className="text-warning">Could not load licensing.</p>
            <p className="mt-1 text-faint">{lic.message}</p>
          </div>
        ) : lic.data.by_tier.length === 0 ? (
          <p className="text-faint text-sm">No licenses issued yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-faint text-xs uppercase">
              <tr>
                <th className="py-2 text-left">Tier</th>
                <th className="py-2 text-left">State</th>
                <th className="py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {lic.data.by_tier.map((t, i) => (
                <tr key={`${t.tier}-${i}`} className="border-t border-border">
                  <td className="py-2 text-fg">{t.tier}</td>
                  <td className="py-2 text-muted">{t.active ? "active" : "inactive"}</td>
                  <td className="py-2 text-right tabular-nums">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
