import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import {
  addBinding,
  listBindings,
  listRoles,
  removeBinding,
  type RoleBinding,
  type RoleDef,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConsoleScope } from "../../lib/console-scope";

export function AccessPage() {
  const { session } = useAuth();
  const token = session?.session_token ?? "";
  const { selectedOrg, selectedProject } = useConsoleScope();

  const [bindings, setBindings] = useState<RoleBinding[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [scope, setScope] = useState<"org" | "project">("org");
  const [principalKind, setPrincipalKind] = useState<"user" | "service_account">("user");
  const [principalId, setPrincipalId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = scope === "project" ? selectedProject?.id : undefined;

  const reload = useCallback(() => {
    if (!token || !selectedOrg) {
      setBindings([]);
      return;
    }
    listBindings(token, selectedOrg.id, scope === "project" ? selectedProject?.id : undefined)
      .then(setBindings)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load bindings"));
  }, [token, selectedOrg, selectedProject, scope]);

  const loadRoles = useCallback(() => {
    if (!token) return;
    listRoles(token)
      .then((rs) => {
        setRoles(rs);
        setRoleName((prev) => prev || rs[0]?.name || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load roles"));
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const grantMyself = () => {
    setPrincipalKind("user");
    setPrincipalId(session?.user_id ?? "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (scope === "project" && !selectedProject) {
      setError("Select a project for project-scoped bindings.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await addBinding(token, {
        org_id: selectedOrg.id,
        project_id: projectId,
        scope_kind: scope,
        scope_id: scope === "project" ? selectedProject!.id : selectedOrg.id,
        principal_kind: principalKind,
        principal_id: principalId.trim(),
        role_name: roleName,
      });
      setPrincipalId("");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add binding");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (id: string) => {
    if (!selectedOrg) return;
    setError(null);
    try {
      await removeBinding(token, id, { org_id: selectedOrg.id, project_id: projectId });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove binding");
    }
  };

  if (!selectedOrg) {
    return <p className="text-gray-500 text-sm">Select an organization to manage access.</p>;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">Scope:</span>
        {(["org", "project"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            disabled={s === "project" && !selectedProject}
            className={`px-3 py-1 rounded-lg border transition ${
              scope === s ? "border-blue-500 bg-blue-500/10 text-white" : "border-gray-800 text-gray-400"
            } disabled:opacity-40`}
          >
            {s === "org" ? `Org: ${selectedOrg.name}` : `Project: ${selectedProject?.name ?? "—"}`}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-lg font-semibold mb-4">Role bindings</h3>
        {bindings.length === 0 ? (
          <p className="text-gray-500 text-sm">No bindings in this scope yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left py-2">Principal</th>
                <th className="text-left py-2">Role</th>
                <th className="text-left py-2">Scope</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bindings.map((b) => (
                <tr key={b.id} className="border-t border-gray-800">
                  <td className="py-2 text-gray-300">
                    <span className="text-gray-500">{b.principal_kind}</span>{" "}
                    <span className="font-mono text-xs">{b.principal_id}</span>
                  </td>
                  <td className="py-2 text-white">{b.role_name}</td>
                  <td className="py-2 text-gray-400">{b.scope_kind}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => onRemove(b.id)}
                      className="text-gray-500 hover:text-red-400 transition"
                      title="Remove binding"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assign a role</h3>
          <button
            onClick={grantMyself}
            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
          >
            <UserPlus className="w-4 h-4" /> Fill in my user
          </button>
        </div>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <select
            value={principalKind}
            onChange={(e) => setPrincipalKind(e.target.value as "user" | "service_account")}
            className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm"
          >
            <option value="user">user</option>
            <option value="service_account">service_account</option>
          </select>
          <select
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          <input
            value={principalId}
            onChange={(e) => setPrincipalId(e.target.value)}
            placeholder="principal id (UUID)"
            required
            className="sm:col-span-2 w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition disabled:opacity-40"
          >
            {busy ? "Working…" : "Add binding"}
          </button>
        </form>
      </section>
    </div>
  );
}
