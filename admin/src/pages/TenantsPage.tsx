import { Search } from "lucide-react";
import { PageHeader, Panel, Stat } from "../components/ui";
import { getTenants } from "../lib/api";
import { useAdminData } from "../lib/use-admin-data";

export function TenantsPage() {
  const tenants = useAdminData(getTenants);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Every organization, project, and user across the fleet."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Organizations" value={tenants.kind === "ok" ? String(tenants.data.totals.orgs) : "—"} />
        <Stat label="Projects" value={tenants.kind === "ok" ? String(tenants.data.totals.projects) : "—"} />
        <Stat label="Users" value={tenants.kind === "ok" ? String(tenants.data.totals.users) : "—"} />
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          disabled
          placeholder="Search (coming soon)…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>

      <Panel title="Organizations">
        {tenants.kind === "loading" ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : tenants.kind === "error" ? (
          <div className="text-sm">
            <p className="text-warning">Could not load tenants.</p>
            <p className="mt-1 text-faint">{tenants.message}</p>
          </div>
        ) : tenants.data.orgs.length === 0 ? (
          <p className="text-faint text-sm">No organizations yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-faint text-xs uppercase">
              <tr>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Slug</th>
                <th className="py-2 text-right">Members</th>
                <th className="py-2 text-right">Projects</th>
              </tr>
            </thead>
            <tbody>
              {tenants.data.orgs.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2 text-fg">{o.name}</td>
                  <td className="py-2 font-mono text-muted">{o.slug}</td>
                  <td className="py-2 text-right tabular-nums">{o.members}</td>
                  <td className="py-2 text-right tabular-nums">{o.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
