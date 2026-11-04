import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, org, type Project } from "../lib/api";

const PRESETS = [
  "What is the current engineering health of the company?",
  "Which projects are at risk, and why?",
  "Which repositories have stale pull requests?",
  "What is causing repeated CI/CD failures?",
  "Which bugs are blocking progress?",
  "What should the engineering team prioritize today?",
];

export function NewInvestigation({ projects, presetProjectId, onClose }: { projects: Project[]; presetProjectId?: string; onClose: () => void }) {
  const [query, setQuery] = useState(PRESETS[0]);
  const [projectId, setProjectId] = useState(presetProjectId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const [idemKey] = useState(() => crypto.randomUUID());

  async function start() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ investigationId: string }>("/api/v1/agents/investigations", {
        method: "POST", headers: { "Idempotency-Key": idemKey },
        body: JSON.stringify({ organizationId: org(), query, scope: { projectIds: projectId ? [projectId] : [], repositoryIds: [] } }),
      });
      onClose();
      nav(`/investigations/${r.data.investigationId}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="New investigation">
        <h2>New AI investigation</h2>
        <p className="muted">Six agents analyse live GitHub and project data. Every finding links to its evidence.</p>
        <label className="field-label">Question</label>
        <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={3} maxLength={1000} />
        <div className="presets">{PRESETS.map((p) => <button key={p} className={`chip-btn ${p === query ? "on" : ""}`} onClick={() => setQuery(p)}>{p}</button>)}</div>
        <label className="field-label">Scope</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {error && <div className="error-box">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || query.trim().length < 3} onClick={start}>{busy ? "Starting…" : "Start investigation"}</button>
        </div>
      </div>
    </div>
  );
}
