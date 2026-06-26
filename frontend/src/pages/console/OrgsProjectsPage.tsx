import { useState } from "react";
import { createOrg, createProject } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConsoleScope } from "../../lib/console-scope";

export function OrgsProjectsPage() {
  const { session } = useAuth();
  const token = session?.session_token ?? "";
  const { orgs, projects, selectedOrg, selectOrg, reloadOrgs, reloadProjects } = useConsoleScope();

  const [orgSlug, setOrgSlug] = useState("");
  const [orgName, setOrgName] = useState("");
  const [projSlug, setProjSlug] = useState("");
  const [projName, setProjName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const org = await createOrg(token, orgSlug.trim(), orgName.trim());
      setOrgSlug("");
      setOrgName("");
      reloadOrgs();
      selectOrg(org.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create org");
    } finally {
      setBusy(false);
    }
  };

  const submitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setError(null);
    setBusy(true);
    try {
      await createProject(token, selectedOrg.id, projSlug.trim(), projName.trim());
      setProjSlug("");
      setProjName("");
      reloadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="grid gap-6 md:grid-cols-2">
        <Panel title="Organizations">
          <List
            items={orgs.map((o) => ({ id: o.id, primary: o.name, secondary: o.slug }))}
            empty="No organizations yet — create one."
            activeId={selectedOrg?.id}
            onPick={selectOrg}
          />
          <form onSubmit={submitOrg} className="mt-4 space-y-2">
            <Input value={orgName} onChange={setOrgName} placeholder="Name (e.g. Acme Inc)" required />
            <Input value={orgSlug} onChange={setOrgSlug} placeholder="slug (e.g. acme)" required />
            <SubmitButton busy={busy}>Create organization</SubmitButton>
          </form>
        </Panel>

        <Panel title={selectedOrg ? `Projects in ${selectedOrg.name}` : "Projects"}>
          {!selectedOrg ? (
            <p className="text-gray-500 text-sm">Select an organization first.</p>
          ) : (
            <>
              <List
                items={projects.map((p) => ({ id: p.id, primary: p.name, secondary: p.slug }))}
                empty="No projects yet — create one."
              />
              <form onSubmit={submitProject} className="mt-4 space-y-2">
                <Input value={projName} onChange={setProjName} placeholder="Name (e.g. Production)" required />
                <Input value={projSlug} onChange={setProjSlug} placeholder="slug (e.g. prod)" required />
                <SubmitButton busy={busy}>Create project</SubmitButton>
              </form>
            </>
          )}
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function List({
  items,
  empty,
  activeId,
  onPick,
}: {
  items: { id: string; primary: string; secondary: string }[];
  empty: string;
  activeId?: string;
  onPick?: (id: string) => void;
}) {
  if (items.length === 0) return <p className="text-gray-500 text-sm">{empty}</p>;
  return (
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button"
            onClick={() => onPick?.(it.id)}
            disabled={!onPick}
            className={`w-full text-left px-3 py-2 rounded-lg border transition ${
              activeId === it.id
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-800 hover:border-gray-700"
            } ${onPick ? "cursor-pointer" : "cursor-default"}`}
          >
            <span className="text-white text-sm">{it.primary}</span>
            <span className="text-gray-500 text-xs ml-2">{it.secondary}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
    />
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition disabled:opacity-40"
    >
      {busy ? "Working…" : children}
    </button>
  );
}
