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
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Orgs &amp; Projects</h1>
        <p className="mt-1 text-sm text-muted">
          Create organizations and the projects scoped under them.
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

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
            <p className="text-faint text-sm">Select an organization first.</p>
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
    <div className="rounded-2xl border border-border bg-surface p-6">
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
  if (items.length === 0) return <p className="text-faint text-sm">{empty}</p>;
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
                ? "border-accent bg-accent/10"
                : "border-border hover:border-border-strong"
            } ${onPick ? "cursor-pointer" : "cursor-default"}`}
          >
            <span className="text-fg text-sm">{it.primary}</span>
            <span className="text-faint text-xs ml-2">{it.secondary}</span>
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
      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
    />
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full bg-accent text-fg py-2 rounded-lg text-sm font-bold hover:bg-accent-hover transition disabled:opacity-40"
    >
      {busy ? "Working…" : children}
    </button>
  );
}
