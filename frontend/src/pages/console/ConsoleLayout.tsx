import { NavLink, Outlet } from "react-router-dom";
import { Activity, Boxes, KeyRound, Terminal } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { ConsoleScopeProvider, useConsoleScope } from "../../lib/console-scope";

function ScopePicker() {
  const { orgs, projects, selectedOrg, selectedProject, selectOrg, selectProject } =
    useConsoleScope();
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2 text-gray-400">
        Org
        <select
          value={selectedOrg?.id ?? ""}
          onChange={(e) => selectOrg(e.target.value)}
          className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-blue-500"
        >
          {orgs.length === 0 && <option value="">— none —</option>}
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-gray-400">
        Project
        <select
          value={selectedProject?.id ?? ""}
          onChange={(e) => selectProject(e.target.value)}
          disabled={!selectedOrg}
          className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-blue-500 disabled:opacity-40"
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

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
    isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
  }`;

function ConsoleShell() {
  const { session, logout } = useAuth();
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Terminal className="text-green-400" /> Console
          </h2>
          <p className="text-gray-500 text-sm mt-1">{session?.email}</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-300 border border-gray-800 rounded-lg px-3 py-1.5 hover:text-white hover:border-gray-600 transition"
        >
          Sign out
        </button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 pb-4 border-b border-gray-800">
        <nav className="flex gap-1">
          <NavLink to="/console" end className={tabClass}>
            <Activity className="w-4 h-4" /> Status
          </NavLink>
          <NavLink to="/console/orgs" className={tabClass}>
            <Boxes className="w-4 h-4" /> Orgs &amp; Projects
          </NavLink>
          <NavLink to="/console/access" className={tabClass}>
            <KeyRound className="w-4 h-4" /> Access
          </NavLink>
        </nav>
        <ScopePicker />
      </div>

      <Outlet />
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
