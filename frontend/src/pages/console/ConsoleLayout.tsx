import { NavLink, Outlet } from "react-router-dom";
import { Activity, Boxes, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { ConsoleScopeProvider, useConsoleScope } from "../../lib/console-scope";
import { ThemeToggle } from "../../components/ThemeToggle";

function ScopePicker() {
  const { orgs, projects, selectedOrg, selectedProject, selectOrg, selectProject } =
    useConsoleScope();
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-faint">
          Organization
        </span>
        <select
          value={selectedOrg?.id ?? ""}
          onChange={(e) => selectOrg(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
        >
          {orgs.length === 0 && <option value="">— none —</option>}
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-faint">
          Project
        </span>
        <select
          value={selectedProject?.id ?? ""}
          onChange={(e) => selectProject(e.target.value)}
          disabled={!selectedOrg}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-40"
        >
          {projects.length === 0 && <option value="">— none —</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const navItem = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-surface-2 text-fg"
      : "text-muted hover:bg-surface-2 hover:text-fg"
  }`;

function ConsoleShell() {
  const { session, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-bg-subtle">
        <div className="flex items-center gap-2 px-5 py-5">
          <img
            src="/images/Laplace_labs.png"
            alt="Laplace"
            className="h-8 w-auto object-contain dark:invert dark:brightness-90"
          />
          <span className="text-sm font-semibold tracking-tight">Console</span>
        </div>

        <div className="border-y border-border px-4 py-4">
          <ScopePicker />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink to="/console" end className={navItem}>
            <Activity className="h-4 w-4" /> Status
          </NavLink>
          <NavLink to="/console/orgs" className={navItem}>
            <Boxes className="h-4 w-4" /> Orgs &amp; Projects
          </NavLink>
          <NavLink to="/console/access" className={navItem}>
            <KeyRound className="h-4 w-4" /> Access
          </NavLink>
        </nav>

        <div className="border-t border-border px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted" title={session?.email}>
              {session?.email}
            </p>
            <ThemeToggle />
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-border-strong hover:text-fg"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function ConsoleLayout() {
  return (
    <ConsoleScopeProvider>
      <ConsoleShell />
    </ConsoleScopeProvider>
  );
}
