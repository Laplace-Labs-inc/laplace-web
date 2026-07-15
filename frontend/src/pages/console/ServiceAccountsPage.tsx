import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import {
  createServiceAccount,
  createServiceAccountKey,
  listServiceAccountKeys,
  listServiceAccounts,
  revokeServiceAccountKey,
  type CreatedServiceAccountKey,
  type ServiceAccount,
  type ServiceAccountKeyMeta,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConsoleScope } from "../../lib/console-scope";

function describeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function fingerprint(value: string): string {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

function keyStatus(key: ServiceAccountKeyMeta): { label: string; className: string } {
  if (key.revoked_at || !key.active) {
    return { label: "Revoked", className: "bg-danger/10 text-danger" };
  }
  if (new Date(key.expires_at).getTime() < Date.now()) {
    return { label: "Expired", className: "bg-surface-2 text-faint" };
  }
  return { label: "Active", className: "bg-accent/10 text-accent" };
}

export function ServiceAccountsPage() {
  const { session } = useAuth();
  const token = session?.session_token ?? "";
  const { selectedOrg, selectedProject } = useConsoleScope();

  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [selectedServiceAccountId, setSelectedServiceAccountId] = useState<string | null>(null);
  const [keys, setKeys] = useState<ServiceAccountKeyMeta[]>([]);
  const [serviceAccountName, setServiceAccountName] = useState("");
  const [newKey, setNewKey] = useState<CreatedServiceAccountKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadServiceAccounts = useCallback(() => {
    if (!token || !selectedOrg || !selectedProject) {
      setServiceAccounts([]);
      setSelectedServiceAccountId(null);
      setKeys([]);
      return Promise.resolve();
    }

    setServiceAccounts([]);
    setSelectedServiceAccountId(null);
    setKeys([]);
    return listServiceAccounts(token, selectedOrg.id, selectedProject.id)
      .then(setServiceAccounts)
      .catch((err) => setError(describeError(err, "Failed to load service accounts")));
  }, [selectedOrg, selectedProject, token]);

  const reloadKeys = useCallback(() => {
    if (!token || !selectedOrg || !selectedProject || !selectedServiceAccountId) {
      setKeys([]);
      return Promise.resolve();
    }

    return listServiceAccountKeys(
      token,
      selectedServiceAccountId,
      selectedOrg.id,
      selectedProject.id,
    )
      .then(setKeys)
      .catch((err) => setError(describeError(err, "Failed to load service-account keys")));
  }, [selectedOrg, selectedProject, selectedServiceAccountId, token]);

  useEffect(() => {
    setError(null);
    void reloadServiceAccounts();
  }, [reloadServiceAccounts]);

  useEffect(() => {
    setSelectedServiceAccountId((previous) => {
      if (previous && serviceAccounts.some((account) => account.id === previous)) return previous;
      return serviceAccounts[0]?.id ?? null;
    });
  }, [serviceAccounts]);

  useEffect(() => {
    void reloadKeys();
  }, [reloadKeys]);

  const selectedServiceAccount = serviceAccounts.find(
    (account) => account.id === selectedServiceAccountId,
  );

  const submitServiceAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrg || !selectedProject || !serviceAccountName.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await createServiceAccount(
        token,
        selectedOrg.id,
        selectedProject.id,
        serviceAccountName.trim(),
      );
      setServiceAccountName("");
      await reloadServiceAccounts();
    } catch (err) {
      setError(describeError(err, "Failed to create service account"));
    } finally {
      setBusy(false);
    }
  };

  const createKey = async () => {
    if (!selectedOrg || !selectedProject || !selectedServiceAccountId) return;
    setError(null);
    setBusy(true);
    try {
      const created = await createServiceAccountKey(
        token,
        selectedServiceAccountId,
        selectedOrg.id,
        selectedProject.id,
      );
      setNewKey(created);
      setCopied(false);
      await reloadKeys();
    } catch (err) {
      setError(describeError(err, "Failed to create service-account key"));
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!selectedOrg || !selectedProject) return;
    if (!globalThis.confirm("Revoke this service-account key? This cannot be undone.")) return;
    setError(null);
    setBusy(true);
    try {
      await revokeServiceAccountKey(token, keyId, {
        org_id: selectedOrg.id,
        project_id: selectedProject.id,
      });
      await reloadKeys();
    } catch (err) {
      setError(describeError(err, "Failed to revoke service-account key"));
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey.key_material);
      setCopied(true);
    } catch {
      setError("Failed to copy the key. Copy it manually from the panel.");
    }
  };

  if (!selectedOrg || !selectedProject) {
    return (
      <p className="text-faint text-sm">
        Select an organization and project to manage service accounts.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Service accounts</h1>
        <p className="mt-1 text-sm text-muted">
          Issue and revoke project-scoped keys for CI and other automated clients.
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {newKey && (
        <section className="rounded-2xl border border-accent bg-accent/10 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Service-account key created</h2>
              <p className="mt-2 text-sm font-bold text-fg">
                Copy this key now — it will not be shown again.
              </p>
              <code className="mt-3 block overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs text-fg">
                {newKey.key_material}
              </code>
              <p className="mt-3 text-xs text-muted">
                Use it with: <code className="font-mono">laplace login --service-account-key &lt;KEY&gt;</code>
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={copyKey}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-fg transition hover:bg-accent-hover"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewKey(null);
                    setCopied(false);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:border-border-strong hover:text-fg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Service accounts</h2>
        {serviceAccounts.length === 0 ? (
          <p className="text-faint text-sm">No service accounts in this project yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-faint text-xs uppercase">
                <tr>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-left">ID</th>
                </tr>
              </thead>
              <tbody>
                {serviceAccounts.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => setSelectedServiceAccountId(account.id)}
                    className={`cursor-pointer border-t border-border transition hover:bg-surface-2 ${
                      selectedServiceAccountId === account.id ? "bg-accent/10" : ""
                    }`}
                  >
                    <td className="py-3 text-fg">{account.name}</td>
                    <td className="py-3 text-muted">{account.email}</td>
                    <td className="py-3 font-mono text-xs text-faint">{account.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={submitServiceAccount} className="mt-4 flex gap-2">
          <input
            value={serviceAccountName}
            onChange={(event) => setServiceAccountName(event.target.value)}
            placeholder="Service-account name"
            required
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-fg transition hover:bg-accent-hover disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> {busy ? "Working…" : "Create"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Keys</h2>
            <p className="mt-1 text-xs text-muted">
              {selectedServiceAccount ? `Keys for ${selectedServiceAccount.name}` : "Select a service account."}
            </p>
          </div>
          <button
            type="button"
            onClick={createKey}
            disabled={busy || !selectedServiceAccount}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-fg transition hover:bg-accent-hover disabled:opacity-40"
          >
            <KeyRound className="h-4 w-4" /> {busy ? "Working…" : "Create key"}
          </button>
        </div>
        {!selectedServiceAccount ? (
          <p className="text-faint text-sm">Select a service account to view its keys.</p>
        ) : keys.length === 0 ? (
          <p className="text-faint text-sm">No keys for this service account yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-faint text-xs uppercase">
                <tr>
                  <th className="py-2 text-left">Fingerprint</th>
                  <th className="py-2 text-left">Created</th>
                  <th className="py-2 text-left">Expires</th>
                  <th className="py-2 text-left">Last used</th>
                  <th className="py-2 text-left">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const status = keyStatus(key);
                  return (
                    <tr key={key.id} className="border-t border-border">
                      <td className="py-3 font-mono text-xs text-fg" title={key.key_fingerprint}>
                        {fingerprint(key.key_fingerprint)}
                      </td>
                      <td className="py-3 text-muted">{formatDate(key.created_at)}</td>
                      <td className="py-3 text-muted">{formatDate(key.expires_at)}</td>
                      <td className="py-3 text-muted">
                        {key.last_used_at ? formatDate(key.last_used_at) : "—"}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {status.label === "Active" && (
                          <button
                            type="button"
                            onClick={() => revokeKey(key.id)}
                            disabled={busy}
                            className="text-xs text-muted transition hover:text-danger disabled:opacity-40"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
