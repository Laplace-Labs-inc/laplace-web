import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  Building2,
  CreditCard,
  Database,
  LogOut,
  ShieldAlert,
  ToggleRight,
} from "lucide-react";
import { ThemeToggle } from "./components/ThemeToggle";
import { useAuth } from "./lib/auth";

type NavItem = { to: string; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Overview", icon: <Activity className="h-[18px] w-[18px]" /> },
      { to: "/tenants", label: "Tenants", icon: <Building2 className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: "Commercial",
    items: [
      { to: "/licensing", label: "Licensing & Billing", icon: <CreditCard className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: "Engine",
    items: [
      { to: "/bugdb", label: "BugDB / Corpus", icon: <Database className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/flags", label: "Feature Flags", icon: <ToggleRight className="h-[18px] w-[18px]" /> },
    ],
  },
];

export function AdminLayout() {
  const { session, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-accent-fg">
            L
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Laplace</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-accent">
              Operator
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((it) => (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      end={it.to === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                          isActive
                            ? "bg-accent/10 font-medium text-fg"
                            : "text-muted hover:bg-surface-2 hover:text-fg"
                        }`
                      }
                    >
                      {it.icon}
                      {it.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border px-3 py-3">
          {session && (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate px-2 text-xs text-muted" title={session.email}>
                {session.email}
              </span>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 px-2 text-xs text-faint">
              <ShieldAlert className="h-3.5 w-3.5 text-accent" />
              Internal
            </span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <span className="text-sm font-medium text-muted">Operator console</span>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
            staging
          </span>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
