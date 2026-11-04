import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { api, org, q, type Project, type ProjectHealth, type Repo, type Task } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Card, CategoryBars, DemoBadge, Empty, ErrorBox, HealthGauge, Loading, StatusBadge } from "../components/ui";
import { fmtDate, pct, scoreColor, timeAgo } from "../lib/format";

export function ProjectsPage() {
  const health = useApi<ProjectHealth[]>(`/api/v1/analytics/projects${q({})}`);
  const projects = useApi<Project[]>(`/api/v1/projects${q({ limit: 100 })}`);
  const [adding, setAdding] = useState(false);
  if (projects.loading && !projects.data) return <Loading />;
  if (projects.error) return <ErrorBox message={projects.error.message} onRetry={projects.reload} />;
  const byId = new Map((health.data ?? []).map((h) => [h.projectId, h]));
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Projects</h1><p className="muted">{projects.data!.length} projects. Click one to see why it has its score.</p></div>
        <button className="btn primary" onClick={() => setAdding(true)}>+ Add project</button>
      </div>
      <div className="project-grid">
        {projects.data!.map((p) => {
          const h = byId.get(p.id);
          return (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <div className="pc-top"><span className="strong">{p.name}</span>{h ? <StatusBadge status={h.status} /> : <span className="muted small">scoring…</span>}</div>
              <div className="muted small clamp">{p.description || "No description"}</div>
              <div className="pc-score" style={{ color: scoreColor(h?.score ?? null) }}>{h?.score ?? "—"}<span className="muted small">/100</span></div>
              <div className="mini-bar wide"><div style={{ width: `${h?.score ?? 0}%`, background: scoreColor(h?.score ?? null) }} /></div>
              <div className="pc-meta mono small muted">{p.repositoryIds.join(", ") || "no repositories"} · due {fmtDate(p.dueDate)}</div>
            </Link>
          );
        })}
      </div>
      {adding && <AddProject onClose={() => setAdding(false)} onCreated={() => { setAdding(false); void projects.reload(); void health.reload(); }} />}
    </div>
  );
}

function AddProject({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const repos = useApi<Repo[]>(`/api/v1/github/repositories${q({})}`);
  const [form, setForm] = useState({ name: "", description: "", repositoryIds: [] as string[], status: "active", dueDate: "", startDate: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError(null);
    try {
      await api("/api/v1/projects", { method: "POST", body: JSON.stringify({ organizationId: org(), ...form,
        startDate: form.startDate || null, dueDate: form.dueDate || null }) });
      onCreated();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  const toggle = (id: string) => setForm((f) => ({ ...f, repositoryIds: f.repositoryIds.includes(id) ? f.repositoryIds.filter((x) => x !== id) : [...f.repositoryIds, id] }));
  return (
    <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2>Add project</h2>
      <label className="field-label">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="field-label">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="row2">
        <div><label className="field-label">Start date</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
        <div><label className="field-label">Due date</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
      </div>
      <label className="field-label">Repositories (from your GitHub organization)</label>
      <div className="repo-pick">
        {repos.loading ? <Loading /> : repos.error ? <ErrorBox message={repos.error.message} /> :
          repos.data!.map((r) => <label key={r.id} className="check"><input type="checkbox" checked={form.repositoryIds.includes(r.id)} onChange={() => toggle(r.id)} /> {r.id}</label>)}
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={busy || !form.name.trim()} onClick={save}>{busy ? "Saving…" : "Create project"}</button></div>
    </div></div>
  );
}

export function ProjectDetail({ onInvestigate }: { onInvestigate: (projectId: string) => void }) {
  const { projectId } = useParams();
  const project = useApi<Project>(`/api/v1/projects/${projectId}`);
  const health = useApi<ProjectHealth>(`/api/v1/projects/${projectId}/health`);
  const tasks = useApi<Task[]>(`/api/v1/projects/${projectId}/tasks?limit=100`);
  if (project.loading && !project.data) return <Loading />;
  if (project.error) return <ErrorBox message={project.error.message} onRetry={project.reload} />;
  const p = project.data!, h = health.data;
  const SHORT = { delivery: "Delivery", ci: "CI/CD", bugs: "Bugs", pullRequests: "Pull requests", activity: "Activity" } as const;
  const radar = h?.subScores.map((s) => ({ dim: SHORT[s.category], score: s.score ?? 0 })) ?? [];
  return (
    <div className="page">
      <Link to="/projects" className="back">← All projects</Link>
      <div className="page-head">
        <div>
          <h1>{p.name} {h && <StatusBadge status={h.status} />} <DemoBadge show={Boolean(h?.isDemoData)} /></h1>
          <p className="muted">{p.description} · Status: {p.status} · Due {fmtDate(p.dueDate)} · Owner: {p.ownerUid ?? <span className="warn">none assigned</span>}</p>
        </div>
        <button className="btn dark" onClick={() => onInvestigate(p.id)}>✦ Run AI investigation</button>
      </div>

      {health.error ? <ErrorBox message={health.error.message} onRetry={health.reload} /> : !h ? <Loading label="Calculating project health…" /> : (
        <>
          <div className="grid-3">
            <Card title="Health score">
              <div className="center"><HealthGauge score={h.score} status={h.status} /></div>
              <p className="muted small center">Data coverage {pct(h.coverage)}{h.missingSignals.length ? ` · missing ${h.missingSignals.join(", ")}` : ""} · computed {timeAgo(h.computedAt)}</p>
            </Card>
            <Card title="Health dimensions">
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={radar} outerRadius={80}>
                  <PolarGrid /><PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="#E8642C" fill="#E8642C" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Why this score"><CategoryBars subScores={h.subScores} /></Card>
          </div>

          <div className="grid-2">
            <Card title={`Stale pull requests (${h.evidence.stalePullRequests.length})`}>
              {h.evidence.stalePullRequests.length ? <ul className="ev-list">{h.evidence.stalePullRequests.map((x) => (
                <li key={`${x.repositoryId}${x.number}`}><a href={x.url} target="_blank" rel="noreferrer">#{x.number} {x.title}</a><span className="muted small">{x.repositoryId} · idle {x.daysSinceUpdate} days</span></li>))}</ul>
                : <Empty>No stale pull requests.</Empty>}
            </Card>
            <Card title={`Open bugs (${h.evidence.openBugs.length})`}>
              {h.evidence.openBugs.length ? <ul className="ev-list">{h.evidence.openBugs.map((x) => (
                <li key={`${x.repositoryId}${x.number}`}><a href={x.url} target="_blank" rel="noreferrer">#{x.number} {x.title}</a><span className={`sev-text s-${x.severity}`}>{x.severity}</span></li>))}</ul>
                : <Empty>No open bugs.</Empty>}
            </Card>
            <Card title={`Recent CI failures (${h.evidence.recentFailedRuns.length})`}>
              {h.evidence.recentFailedRuns.length ? <ul className="ev-list">{h.evidence.recentFailedRuns.map((x) => (
                <li key={x.id}><a href={x.url} target="_blank" rel="noreferrer">{x.name} run #{x.id}</a><span className="muted small">{x.repositoryId} · {x.conclusion} · {timeAgo(x.createdAt)}</span></li>))}</ul>
                : <Empty>No failed runs in the last 14 days.</Empty>}
            </Card>
            <Card title="Delivery blockers">
              {h.evidence.overdueTasks.length + h.evidence.blockedTasks.length ? <ul className="ev-list">
                {h.evidence.blockedTasks.map((t) => <li key={`b${t.taskId}`}><span>⛔ {t.title}</span><span className="sev-text s-high">blocked</span></li>)}
                {h.evidence.overdueTasks.map((t) => <li key={`o${t.taskId}`}><span>⏰ {t.title}</span><span className="muted small">due {fmtDate(t.dueDate)} · {t.status}</span></li>)}
              </ul> : <Empty>No overdue or blocked tasks.</Empty>}
            </Card>
          </div>
          {h.repositoryErrors.length > 0 && <div className="notice">Some data couldn’t be read: {h.repositoryErrors.map((e) => `${e.repositoryId} ${e.signal} (${e.code})`).join("; ")}.</div>}
        </>
      )}
      <TasksCard projectId={p.id} tasks={tasks.data ?? []} reload={() => { void tasks.reload(); void health.reload(); }} />
    </div>
  );
}

function TasksCard({ projectId, tasks, reload }: { projectId: string; tasks: Task[]; reload: () => void }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function add() {
    try { await api(`/api/v1/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify({ title, dueDate: due || null }) }); setTitle(""); setDue(""); reload(); }
    catch (e) { setError((e as Error).message); }
  }
  async function setStatus(id: string, status: string) {
    try { await api(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); reload(); }
    catch (e) { setError((e as Error).message); }
  }
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <Card title={`Tasks · ${done}/${tasks.length} done`}>
      <div className="mini-bar wide"><div style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`, background: "#3F7D58" }} /></div>
      <table className="table compact"><thead><tr><th>Task</th><th>Due</th><th>Assignee</th><th>Status</th></tr></thead><tbody>
        {tasks.map((t) => {
          const overdue = t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date();
          return (
            <tr key={t.id}><td>{t.title}</td><td className={overdue ? "warn" : ""}>{fmtDate(t.dueDate)}{overdue && " (overdue)"}</td>
              <td className="muted">{t.assigneeUid ? "assigned" : <span className="warn">unassigned</span>}</td>
              <td><select value={t.status} onChange={(e) => void setStatus(t.id, e.target.value)}>
                {["todo", "in_progress", "blocked", "done"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></td></tr>
          );
        })}
      </tbody></table>
      <div className="row add-row">
        <input placeholder="New task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn" disabled={!title.trim()} onClick={() => void add()}>Add task</button>
      </div>
      {error && <div className="error-box">{error}</div>}
    </Card>
  );
}
