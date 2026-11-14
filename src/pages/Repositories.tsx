import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { q, type Repo } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Card, DemoBadge, Empty, ErrorBox, Kpi, Loading } from "../components/ui";
import { DEFINE, Explain, InfoTip } from "../lib/explain";
import { STATUS_COLOR, fmtDate, pct, timeAgo } from "../lib/format";

export function RepositoriesPage() {
  const repos = useApi<Repo[]>(`/api/v1/github/repositories${q({})}`);
  if (repos.loading && !repos.data) return <Loading label="Reading repositories from GitHub…" />;
  if (repos.error) return <ErrorBox message={repos.error.message} onRetry={repos.reload} />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Repositories</h1><p className="muted">{repos.data!.length} repositories in the connected GitHub organization. <DemoBadge show={repos.meta?.isDemoData} /></p></div></div>
      <Explain>A <strong>repository</strong> is a project’s folder of code on GitHub, including the full history of every change.
        This list comes live from GitHub. Open one to see its automated test results, pending code reviews and recent activity.</Explain>
      <Card>
        <table className="table"><thead><tr><th>Repository</th><th>Default branch</th><th>Last push</th><th></th></tr></thead><tbody>
          {repos.data!.map((r) => (
            <tr key={r.id}><td><Link to={`/repositories/${r.id}`} className="strong">{r.id}</Link>{r.archived && <span className="chip">archived</span>}<div className="muted small">{r.description}</div></td>
              <td className="mono">{r.defaultBranch}</td><td className="muted">{timeAgo(r.pushedAt)}</td><td><Link to={`/repositories/${r.id}`}>Details →</Link></td></tr>))}
        </tbody></table>
      </Card>
    </div>
  );
}

interface RepoDetail {
  repository: Repo;
  summary: {
    openIssues: number | null; openBugs: number | null; openPullRequests: number | null; stalePullRequests: number | null;
    ci: { considered: number; successes: number; failures: number; successRate: number | null; consecutiveFailures: number; lastSuccessAt: string | null } | null;
    activity: { commitsInWindow: number; lastActivityAt: string | null } | null;
    deployments: string | Array<{ id: number; environment: string; ref: string; createdAt: string; latestStatus: { state: string } | null }>;
  };
  unavailableSignals: string[];
}
interface Pull { number: number; title: string; url: string; updatedAt: string; stale: boolean; author: string | null }
interface Run { id: number; name: string; conclusion: string | null; status: string; createdAt: string; url: string; headBranch: string | null }

export function RepositoryDetail() {
  const { repositoryId } = useParams();
  const d = useApi<RepoDetail>(`/api/v1/github/repositories/${repositoryId}${q({})}`);
  const pulls = useApi<Pull[]>(`/api/v1/github/repositories/${repositoryId}/pulls${q({})}`);
  const runs = useApi<{ runs: Run[] }>(`/api/v1/github/repositories/${repositoryId}/workflows${q({})}`);
  if (d.loading && !d.data) return <Loading label="Reading GitHub…" />;
  if (d.error) return <ErrorBox message={d.error.message} onRetry={d.reload} />;
  const { repository: r, summary: s } = d.data!;
  const runData = [...(runs.data?.runs ?? [])].reverse().map((x) => ({ name: new Date(x.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }), v: 1, c: x.conclusion ?? x.status }));
  return (
    <div className="page">
      <Link to="/repositories" className="back">← All repositories</Link>
      <div className="page-head"><div><h1>{r.id} <DemoBadge show={d.meta?.isDemoData} /></h1><p className="muted"><a href={r.url} target="_blank" rel="noreferrer">{r.fullName} ↗</a> · branch {r.defaultBranch}</p></div></div>
      <Explain>These numbers come straight from GitHub. The coloured bars below show the repository’s recent <strong>automatic build-and-test runs</strong>:
        each bar is one run, green passed and red failed. Lots of red means changes keep breaking things.</Explain>
      <div className="kpis">
        <Kpi icon="🎫" info={DEFINE.issues} label="Open issues" value={s.openIssues ?? "—"} hint={`${s.openBugs ?? 0} labelled as bugs (PRs excluded)`} />
        <Kpi icon="🔀" info={DEFINE.openPrs} label="Open pull requests" value={s.openPullRequests ?? "—"} hint={`${s.stalePullRequests ?? 0} stale`} tone={s.stalePullRequests ? STATUS_COLOR.warning : undefined} />
        <Kpi icon="🧪" info={DEFINE.passRate} label="CI pass rate" value={s.ci?.successRate == null ? "—" : pct(s.ci.successRate)} hint={s.ci ? `${s.ci.successes}/${s.ci.considered} runs, last 14 days` : "No CI data"}
          tone={s.ci?.successRate == null ? undefined : s.ci.successRate >= 0.8 ? STATUS_COLOR.healthy : STATUS_COLOR.critical} />
        <Kpi icon="💾" info={DEFINE.commits} label="Commits (14 days)" value={s.activity?.commitsInWindow ?? "—"} hint={`Last activity ${timeAgo(s.activity?.lastActivityAt)}`} />
      </div>
      <div className="grid-2">
        <Card title={<>Recent workflow runs <InfoTip text={DEFINE.ci} /></>}>
          {runData.length ? (<>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={runData}><XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" /><YAxis hide domain={[0, 1]} />
                <Tooltip formatter={(_v, _n, it: any) => [it.payload.c, "Result"]} />
                <Bar dataKey="v">{runData.map((x, i) => <Cell key={i} fill={x.c === "success" ? STATUS_COLOR.healthy : x.c === "failure" || x.c === "timed_out" ? STATUS_COLOR.critical : "#C9C2B8"} />)}</Bar></BarChart>
            </ResponsiveContainer>
            <p className="muted small">Green = passed, red = failed, grey = cancelled or in progress. {s.ci && s.ci.consecutiveFailures >= 2 && <span className="warn">The last {s.ci.consecutiveFailures} runs failed.</span>}</p>
          </>) : <Empty>No workflow runs in the last 14 days.</Empty>}
        </Card>
        <Card title={<>Deployments <InfoTip text="A deployment is installing a new version on the live servers customers use." /></>}>
          {typeof s.deployments === "string" ? (
            <Empty>{s.deployments === "no_deployment_data" ? "No GitHub deployment records for this repository, so deployment health is not assessed (only build status is known)." : "Deployment data unavailable."}</Empty>
          ) : (
            <ul className="ev-list">{s.deployments.map((x) => <li key={x.id}><span>{x.environment} · {x.ref}</span><span className={`sev-text ${x.latestStatus?.state === "success" ? "s-ok" : "s-high"}`}>{x.latestStatus?.state ?? "no status"} · {fmtDate(x.createdAt)}</span></li>)}</ul>
          )}
        </Card>
      </div>
      <Card title={`Open pull requests (${pulls.data?.length ?? 0})`}>
        {pulls.data?.length ? <ul className="ev-list">{pulls.data.map((p) => (
          <li key={p.number}><a href={p.url} target="_blank" rel="noreferrer">#{p.number} {p.title}</a><span className={p.stale ? "sev-text s-medium" : "muted small"}>{p.stale ? "stale · " : ""}updated {timeAgo(p.updatedAt)}</span></li>))}</ul>
          : <Empty>No open pull requests.</Empty>}
      </Card>
      {d.data!.unavailableSignals.length > 0 && <div className="notice">Couldn’t read: {d.data!.unavailableSignals.join(", ")}.</div>}
    </div>
  );
}
