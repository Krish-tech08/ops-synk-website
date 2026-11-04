import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, q, type Category, type CompanyHealth, type HealthStatus, type Investigation, type ProjectHealth } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Card, CategoryBars, DemoBadge, Empty, ErrorBox, HealthGauge, Kpi, Loading, StatusBadge } from "../components/ui";
import { STATUS_COLOR, STATUS_LABEL, pct, scoreColor, timeAgo } from "../lib/format";

export function Overview({ onNewInvestigation }: { onNewInvestigation: () => void }) {
  const company = useApi<CompanyHealth>(`/api/v1/analytics/company${q({})}`);
  const projects = useApi<ProjectHealth[]>(`/api/v1/analytics/projects${q({})}`);
  const investigations = useApi<Investigation[]>(`/api/v1/agents/investigations${q({ limit: 5 })}`);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  if (company.loading && !company.data) return <Loading label="Calculating engineering health from GitHub and project data…" />;
  if (company.error) return <ErrorBox message={company.error.message} onRetry={company.reload} />;
  const c = company.data!;
  const ps = projects.data ?? [];

  async function sync() {
    setSyncMsg("Syncing with GitHub…");
    try {
      const r = await api<{ snapshotIds: string[]; unreachableRepositories: string[] }>(`/api/v1/github/sync${q({})}`, { method: "POST" });
      setSyncMsg(`Synced ${r.data.snapshotIds.length} repositories${r.data.unreachableRepositories.length ? `, ${r.data.unreachableRepositories.length} unreachable` : ""}.`);
      void company.reload(); void projects.reload();
    } catch (e) { setSyncMsg((e as Error).message); }
  }

  const cats: Category[] = ["delivery", "ci", "bugs", "pullRequests", "activity"];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Engineering Overview</h1>
          <p className="muted">Live health of your engineering organization, calculated from GitHub and project data. Computed {timeAgo(c.computedAt)}. <DemoBadge show={c.containsDemoData} /></p>
        </div>
        <div className="row">
          {syncMsg && <span className="muted small">{syncMsg}</span>}
          <button className="btn" onClick={sync}>⟳ Sync GitHub</button>
          <button className="btn primary" onClick={onNewInvestigation}>✦ Ask the agents</button>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Overall engineering health" action={<StatusBadge status={c.status} />}>
          <div className="health-hero">
            <HealthGauge score={c.score} status={c.status} />
            <div>
              <p className="lead">{heroText(c)}</p>
              <p className="muted small">Data coverage {pct(c.coverage)}{c.missingSignals.length ? `; missing: ${c.missingSignals.join(", ")}` : ""}. Bands: healthy ≥ {c.bands.healthy}, warning ≥ {c.bands.warning}.</p>
            </div>
          </div>
        </Card>
        <Card title="What drives the score">
          <CategoryBars weights={c.weights} subScores={cats.map((k) => ({ category: k, score: c.categoryScores[k] ?? null, reason: null }))} />
          <p className="muted small">Each category is the average across projects, weighted as shown. Scores are calculated by fixed rules, not by AI.</p>
        </Card>
      </div>

      <Kpis projects={ps} company={c} />

      <div className="grid-2">
        <Card title="Project scores">
          {ps.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, ps.length * 28)}>
              <BarChart data={ps.map((p) => ({ name: p.projectName, score: p.score ?? 0, raw: p.score }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number, _n, item: any) => [item.payload.raw === null ? "No data" : `${v}/100`, "Health"]} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>{ps.map((p) => <Cell key={p.projectId} fill={scoreColor(p.score)} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty>No projects yet.</Empty>}
        </Card>
        <Card title="Projects by status">
          <StatusDonut counts={c.projectCounts} />
          <LatestInvestigation list={investigations.data ?? []} onNew={onNewInvestigation} />
        </Card>
      </div>

      <ProjectBoard projects={ps} loading={projects.loading} />
    </div>
  );
}

function heroText(c: CompanyHealth) {
  if (c.status === "insufficient_data") return "Not enough data yet to score the organization. Map repositories to projects and add tasks.";
  const n = c.projectCounts;
  const parts = [`${n.healthy} healthy`, `${n.warning} need attention`, `${n.critical} critical`].filter((s) => !s.startsWith("0 "));
  return `Your organization is ${c.status === "healthy" ? "in good shape" : c.status === "warning" ? "under some pressure" : "at risk"}: ${parts.join(", ")}.`;
}

function Kpis({ projects, company }: { projects: ProjectHealth[]; company: CompanyHealth }) {
  const sum = (f: (p: ProjectHealth) => number) => projects.reduce((a, p) => a + f(p), 0);
  const stale = sum((p) => p.evidence.stalePullRequests.length);
  const bugs = sum((p) => p.evidence.openBugs.length);
  const critBugs = sum((p) => p.evidence.openBugs.filter((b) => b.severity === "critical").length);
  const failed = sum((p) => p.evidence.recentFailedRuns.length);
  const overdue = sum((p) => p.evidence.overdueTasks.length);
  return (
    <div className="kpis">
      <Kpi label="Active projects" value={projects.length} hint={`${company.projectCounts.healthy} healthy · ${company.projectCounts.warning} warning · ${company.projectCounts.critical} critical`} />
      <Kpi label="Stale pull requests" value={stale} hint="No update for 7+ days" tone={stale ? STATUS_COLOR.warning : undefined} />
      <Kpi label="Open bugs" value={bugs} hint={critBugs ? `${critBugs} critical` : "None critical"} tone={critBugs ? STATUS_COLOR.critical : undefined} />
      <Kpi label="Recent CI failures" value={failed} hint="Latest failed runs (up to 5 per repository, last 14 days)" tone={failed ? STATUS_COLOR.critical : undefined} />
      <Kpi label="Overdue tasks" value={overdue} hint="Open tasks past their due date" tone={overdue ? STATUS_COLOR.warning : undefined} />
    </div>
  );
}

function StatusDonut({ counts }: { counts: Record<HealthStatus, number> }) {
  const data = (Object.keys(counts) as HealthStatus[]).filter((k) => counts[k] > 0).map((k) => ({ name: STATUS_LABEL[k], value: counts[k], color: STATUS_COLOR[k] }));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="donut-wrap">
      <ResponsiveContainer width={160} height={160}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={2} stroke="none">{data.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="legend">
        <div className="legend-total">{total} projects</div>
        {data.map((d) => <div key={d.name}><span className="dot" style={{ background: d.color }} />{d.name}: <strong>{d.value}</strong></div>)}
      </div>
    </div>
  );
}

function LatestInvestigation({ list, onNew }: { list: Investigation[]; onNew: () => void }) {
  const latest = list[0];
  const detail = useApi<Investigation>(latest?.hasReport ? `/api/v1/agents/investigations/${latest.id}` : null);
  if (!latest) return <div className="latest"><p className="muted">No AI investigation yet.</p><button className="btn small primary" onClick={onNew}>Run the first one</button></div>;
  const recs = detail.data?.finalReport?.recommendations.slice(0, 3) ?? [];
  return (
    <div className="latest">
      <div className="latest-head"><span className="label">Latest investigation</span><Link to={`/investigations/${latest.id}`}>Open →</Link></div>
      <div className="latest-q">“{latest.query}”</div>
      <div className="muted small">{latest.status} · {timeAgo(latest.createdAt)}</div>
      {recs.map((r) => <div key={r.id} className={`rec-mini p-${r.priority}`}><span className="prio">{r.priority}</span>{r.title}</div>)}
    </div>
  );
}

function ProjectBoard({ projects, loading }: { projects: ProjectHealth[]; loading: boolean }) {
  const [tab, setTab] = useState<"all" | HealthStatus>("all");
  const [filter, setFilter] = useState("");
  const nav = useNavigate();
  const rows = useMemo(() => projects.filter((p) => (tab === "all" || p.status === tab) && p.projectName.toLowerCase().includes(filter.toLowerCase())), [projects, tab, filter]);
  const count = (s: HealthStatus) => projects.filter((p) => p.status === s).length;
  const ci = (p: ProjectHealth) => p.subScores.find((s) => s.category === "ci")?.score ?? null;
  return (
    <Card title={<>Project health board <span className="chip">{projects.length}</span></>}
      action={<input className="search" placeholder="Filter projects…" value={filter} onChange={(e) => setFilter(e.target.value)} />}>
      <div className="tabs">
        {(["all", "critical", "warning", "healthy"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t === "all" ? `All (${projects.length})` : `${STATUS_LABEL[t]} (${count(t)})`}
          </button>
        ))}
      </div>
      {loading && !projects.length ? <Loading /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Project</th><th>Health</th><th>Status</th><th>Stale PRs</th><th>Open bugs</th><th>CI health</th><th>Overdue tasks</th><th>Coverage</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.projectId} className="clickable" onClick={() => nav(`/projects/${p.projectId}`)}>
                <td><div className="strong">{p.projectName}</div><div className="mono muted small">{p.repositoryIds.join(", ") || "no repositories"}</div></td>
                <td><div className="mini-bar"><div style={{ width: `${p.score ?? 0}%`, background: scoreColor(p.score) }} /></div><span className="mono">{p.score ?? "—"}</span></td>
                <td><StatusBadge status={p.status} /></td>
                <td className={p.evidence.stalePullRequests.length ? "warn" : ""}>{p.evidence.stalePullRequests.length}</td>
                <td>{p.evidence.openBugs.length}{p.evidence.openBugs.some((b) => b.severity === "critical") && <span className="crit-dot" title="Has critical bugs">●</span>}</td>
                <td style={{ color: scoreColor(ci(p)) }}>{ci(p) === null ? "No data" : `${ci(p)}/100`}</td>
                <td className={p.evidence.overdueTasks.length ? "warn" : ""}>{p.evidence.overdueTasks.length}</td>
                <td className="muted">{pct(p.coverage)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8}><Empty>No projects match.</Empty></td></tr>}
          </tbody>
        </table></div>
      )}
    </Card>
  );
}
