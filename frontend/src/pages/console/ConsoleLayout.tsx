import { NavLink, Outlet } from "react-router-dom";
import { Activity, Boxes, ChevronsUpDown, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { ConsoleScopeProvider, useConsoleScope } from "../../lib/console-scope";
import { ThemeToggle } from "../../components/ThemeToggle";

/** Org switcher styled as an Anthropic-console workspace pill (native select
 *  overlaid on a styled row so it stays accessible/keyboard-friendly). */
function WorkspaceSwitcher() {
  const { orgs, selectedOrg, selectOrg } = useConsoleScope();
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-semibold text-accent-fg">
          {(selectedOrg?.name ?? "L").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {selectedOrg?.name ?? "No organization"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-faint" />
      </div>
      <select
        aria-label="Switch organization"
        value={selectedOrg?.id ?? ""}
        onChange={(e) => selectOrg(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {orgs.length === 0 && <option value="">No organization</option>}
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProjectPicker() {
  const { projects, selectedOrg, selectedProject, selectProject } = useConsoleScope();
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[11px] font-medium uppercase tracking-wide text-faint">
        Project
      </span>
      <select
        value={selectedProject?.id ?? ""}
        onChange={(e) => selectProject(e.target.value)}
        disabled={!selectedOrg}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-40"
      >
        {projects.length === 0 && <option value="">— none —</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

const navItem = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? "bg-surface-2 font-medium text-fg"
      : "text-muted hover:bg-surface-2 hover:text-fg"
  }`;

function Avatar({ email }: { email?: string }) {
  const ch = (email ?? "?").trim().slice(0, 1).toUpperCase();
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
      {ch}
    </span>
  );
}

function ConsoleShell() {
  const { session, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-bg-subtle">
        <div className="flex items-center gap-2 px-4 py-4">
          <img
            src="/images/Laplace_labs.png"
            alt="Laplace"
            className="h-7 w-auto object-contain dark:invert dark:brightness-90"
          />
          <span className="text-[13px] font-semibold tracking-tight text-muted">
            Console
          </span>
        </div>

        <div className="space-y-2.5 px-3">
          <WorkspaceSwitcher />
          <ProjectPicker />
        </div>

        <nav className="flex-1 px-2 pt-5">
          <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">
            Workspace
          </p>
          <div className="space-y-0.5">
            <NavLink to="/console" end className={navItem}>
              <Activity className="h-[18px] w-[18px]" /> Status
            </NavLink>
            <NavLink to="/console/orgs" className={navItem}>
              <Boxes className="h-[18px] w-[18px]" /> Orgs &amp; Projects
            </NavLink>
            <NavLink to="/console/access" className={navItem}>
              <KeyRound className="h-[18px] w-[18px]" /> Access
            </NavLink>
          </div>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
            <Avatar email={session?.email} />
            <p className="min-w-0 flex-1 truncate text-xs text-muted" title={session?.email}>
              {session?.email}
            </p>
            <ThemeToggle />
          </div>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <LogOut className="h-[18px] w-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-10 py-10">
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
