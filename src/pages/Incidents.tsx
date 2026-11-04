import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, org, q, type Incident, type Project } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Card, Empty, ErrorBox, Loading } from "../components/ui";
import { timeAgo } from "../lib/format";

const SEV = { sev1: "Sev 1 · critical", sev2: "Sev 2 · high", sev3: "Sev 3 · medium", sev4: "Sev 4 · low" } as const;

export function IncidentsPage({ projects }: { projects: Project[] }) {
  const list = useApi<Incident[]>(`/api/v1/incidents${q({ limit: 100 })}`);
  const [form, setForm] = useState({ title: "", description: "", severity: "sev2", projectId: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const nav = useNavigate();
  const name = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "—";

  async function create() {
    setError(null);
    try {
      await api("/api/v1/incidents", { method: "POST", body: JSON.stringify({ organizationId: org(), ...form, projectId: form.projectId || null }) });
      setForm({ title: "", description: "", severity: "sev2", projectId: "" }); void list.reload();
    } catch (e) { setError((e as Error).message); }
  }
  async function investigate(id: string) {
    setBusy(id);
    try { const r = await api<{ investigationId: string }>(`/api/v1/incidents/${id}/investigate`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } }); nav(`/investigations/${r.data.investigationId}`); }
    catch (e) { setError((e as Error).message); setBusy(null); }
  }
  async function setStatus(id: string, status: string) {
    try { await api(`/api/v1/incidents/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); void list.reload(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="page">
      <div className="page-head"><div><h1>Incidents</h1><p className="muted">Record an incident, then let the agents investigate it with the related project’s data.</p></div></div>
      {error && <div className="error-box">{error}</div>}
      <div className="grid-incidents">
        <Card title="Open and recent incidents">
          {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox message={list.error.message} onRetry={list.reload} /> : !list.data!.length ? <Empty>No incidents. 🎉</Empty> : (
            list.data!.map((i) => (
              <div key={i.id} className={`incident sev-${i.severity}`}>
                <div className="incident-top"><span className={`sev-pill ${i.severity}`}>{SEV[i.severity as keyof typeof SEV] ?? i.severity}</span><strong>{i.title}</strong></div>
                <div className="muted small">{i.description}</div>
                <div className="incident-foot">
                  <span className="muted small">Project: {name(i.projectId)} · opened {timeAgo(i.createdAt)} · {i.investigationIds.length} investigation(s)</span>
                  <div className="row">
                    <select value={i.status} onChange={(e) => void setStatus(i.id, e.target.value)}>{["open", "investigating", "mitigated", "resolved"].map((s) => <option key={s}>{s}</option>)}</select>
                    <button className="btn small primary" disabled={busy === i.id} onClick={() => void investigate(i.id)}>{busy === i.id ? "Starting…" : "✦ Investigate with AI"}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
        <Card title="Report an incident">
          <label className="field-label">Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Checkout failures after release" />
          <label className="field-label">What is happening?</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="field-label">Severity</label>
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{Object.entries(SEV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <label className="field-label">Affected project</label>
          <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Not linked</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="btn primary full" disabled={form.title.trim().length < 3} onClick={() => void create()}>Create incident</button>
        </Card>
      </div>
    </div>
  );
}
