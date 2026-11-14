import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api, q, streamEvents, type Finding, type Investigation, type InvestigationEvent, type Report } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Card, CategoryBars, DemoBadge, Empty, ErrorBox, HealthGauge, KindBadge, Loading, SeverityBadge, StatusBadge } from "../components/ui";
import { AGENT_LABEL, AGENT_ROLE, timeAgo } from "../lib/format";
import { AgentGraph, agentDescription, agentTitle } from "../components/viz";
import { Explain } from "../lib/explain";

const TERMINAL = ["completed", "partial", "failed"];
const STATUS_TEXT: Record<string, string> = { queued: "Queued", running: "Running", completed: "Completed", partial: "Partial (some data missing)", failed: "Failed" };

export function InvestigationsPage({ onNew }: { onNew: () => void }) {
  const list = useApi<Investigation[]>(`/api/v1/agents/investigations${q({ limit: 50 })}`);
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>AI Investigations</h1><p className="muted">Ask a question; six agents gather evidence from GitHub and project data and write a verified report.</p></div>
        <button className="btn primary" onClick={onNew}>+ New investigation</button>
      </div>
      <Explain>Instead of a manager digging through GitHub for hours, they type a question like <em>“Which projects are at risk?”</em>.
        Six AI agents gather the facts and write a short report with proof. Open any row to replay it, or see <strong>How the agents work</strong> for the animated diagram.</Explain>
      <Card>
        {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox message={list.error.message} onRetry={list.reload} /> :
          !list.data!.length ? <Empty>No investigations yet. <button className="btn small primary" onClick={onNew}>Run the first one</button></Empty> : (
          <table className="table"><thead><tr><th>Question</th><th>Status</th><th>Started</th><th></th></tr></thead><tbody>
            {list.data!.map((i) => (
              <tr key={i.id}><td><Link to={`/investigations/${i.id}`} className="strong">{i.query}</Link>{i.incidentId && <span className="chip">incident</span>}</td>
                <td><span className={`run-status rs-${i.status}`}>{STATUS_TEXT[i.status]}</span></td><td className="muted">{timeAgo(i.createdAt)}</td>
                <td><Link to={`/investigations/${i.id}`}>Open →</Link></td></tr>))}
          </tbody></table>
        )}
      </Card>
    </div>
  );
}

export function InvestigationDetail() {
  const { investigationId: id } = useParams();
  const [inv, setInv] = useState<Investigation | null>(null);
  const [events, setEvents] = useState<InvestigationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<"stream" | "polling" | "done">("stream");
  const last = useRef(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let stopped = false;
    const add = (evs: InvestigationEvent[]) => {
      const fresh = evs.filter((e) => e.sequence > last.current);
      if (!fresh.length) return;
      last.current = fresh[fresh.length - 1].sequence;
      setEvents((cur) => [...cur, ...fresh]);
    };
    const refresh = async () => { const r = await api<Investigation>(`/api/v1/agents/investigations/${id}`); setInv(r.data); return r.data; };
    (async () => {
      try {
        const first = await refresh();
        const evs = await api<InvestigationEvent[]>(`/api/v1/agents/investigations/${id}/events?after=0`);
        add(evs.data);
        if (TERMINAL.includes(first.status)) { setLive("done"); return; }
        try {
          await streamEvents(id!, last.current, (e) => { add([e]); if (/investigation\.(completed|partial|failed)/.test(e.eventType)) void refresh(); else if (e.eventType.startsWith("agent.") || e.eventType.startsWith("review.") || e.eventType === "manager.plan_created") void refresh(); }, ctrl.signal);
          await refresh(); setLive("done");
        } catch {
          if (stopped) return;
          setLive("polling");
          while (!stopped) {
            await new Promise((r) => setTimeout(r, 2000));
            const r = await api<InvestigationEvent[]>(`/api/v1/agents/investigations/${id}/events?after=${last.current}`);
            add(r.data);
            const cur = await refresh();
            if (TERMINAL.includes(cur.status)) { setLive("done"); break; }
          }
        }
      } catch (e) { if (!stopped) setError((e as Error).message); }
    })();
    return () => { stopped = true; ctrl.abort(); };
  }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!inv) return <Loading label="Loading investigation…" />;
  const running = !TERMINAL.includes(inv.status);
  return (
    <div className="page">
      <Link to="/investigations" className="back">← All investigations</Link>
      <div className="page-head">
        <div>
          <div className="eyebrow">Investigation · started {timeAgo(inv.createdAt)}</div>
          <h1 className="query-title">“{inv.query}”</h1>
          <div className="row"><span className={`run-status rs-${inv.status}`}>{running && <span className="pulse" />}{STATUS_TEXT[inv.status]}</span>
            {inv.plan && <span className="muted small">Plan by {inv.plan.source === "model" ? "Gemini" : "rules"}: {inv.plan.agents.map((a) => AGENT_LABEL[a]).join(", ")}</span>}
            {live === "polling" && <span className="muted small">(live stream unavailable, refreshing every 2 s)</span>}</div>
        </div>
      </div>
      <Explain title="What is happening here?">
        You asked a question; six AI agents are now working on it. The diagram below lights up as each agent starts (orange) and finishes (green),
        and the <strong>Live activity</strong> feed shows every step they take. When they finish, a report appears further down, and every finding links to its proof.
      </Explain>
      <LiveGraph inv={inv} running={running} />
      <div className="grid-pipeline">
        <Pipeline inv={inv} events={events} />
        <ActivityFeed events={events} running={running} />
      </div>
      {inv.status === "failed" && <div className="error-box">{inv.errorSummary ?? "The investigation failed."}</div>}
      {inv.finalReport && <ReportView report={inv.finalReport} />}
    </div>
  );
}

function LiveGraph({ inv, running }: { inv: Investigation; running: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const st: Record<string, any> = { question: "completed" };
  for (const a of ["manager", "github", "project", "bug", "devops", "review"]) st[a] = inv.agentStatuses[a] ?? (running ? "pending" : "skipped");
  st.report = inv.finalReport ? "completed" : inv.status === "failed" ? "failed" : st.review === "completed" ? "running" : "pending";
  return (
    <Card title={<>Agent map {running && <span className="pulse" />}</>}>
      <AgentGraph statuses={st} selected={sel} onSelect={setSel} />
      <div className="graph-caption">{sel ? <><strong>{agentTitle(sel)}:</strong> {agentDescription(sel)} · status: <strong>{st[sel]}</strong></> : "Click a box to see what that agent does."}</div>
    </Card>
  );
}

function Pipeline({ inv, events }: { inv: Investigation; events: InvestigationEvent[] }) {
  const agents = ["manager", "github", "project", "bug", "devops", "review"];
  const stats = useMemo(() => {
    const m: Record<string, { tools: number; findings: number | null; last: string | null }> = {};
    for (const a of agents) m[a] = { tools: 0, findings: null, last: null };
    for (const e of events) {
      if (!e.agentId || !m[e.agentId]) continue;
      if (e.eventType === "tool.completed" && !e.metadata.cached) m[e.agentId].tools++;
      if (e.eventType === "agent.findings_ready") m[e.agentId].findings = Number(e.metadata.findings ?? 0);
      if (e.eventType === "review.completed") m[e.agentId].findings = Number(e.metadata.verified ?? 0);
      m[e.agentId].last = e.message;
    }
    return m;
  }, [events]);
  return (
    <Card title="Agent pipeline">
      <ol className="pipeline">
        {agents.map((a, i) => {
          const st = inv.agentStatuses[a] ?? (TERMINAL.includes(inv.status) ? "skipped" : "pending");
          return (
            <li key={a} className={`step st-${st}`}>
              <span className="step-num">{st === "completed" ? "✓" : st === "failed" ? "✕" : i + 1}</span>
              <div className="step-body">
                <div className="step-top"><strong>{AGENT_LABEL[a]} agent</strong><span className={`step-status st-${st}`}>{st}</span></div>
                <div className="muted small">{AGENT_ROLE[a]}</div>
                {(stats[a].tools > 0 || stats[a].findings !== null) && (
                  <div className="step-meta mono small">{stats[a].tools} data calls{stats[a].findings !== null && ` · ${stats[a].findings} ${a === "review" ? "verified" : "findings"}`}</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function ActivityFeed({ events, running }: { events: InvestigationEvent[]; running: boolean }) {
  const shown = events.filter((e) => !(e.eventType === "tool.started")).slice(-40).reverse();
  return (
    <Card title={<>Live activity {running && <span className="pulse" />}</>} className="feed-card">
      <div className="feed">
        {shown.map((e) => (
          <div key={e.sequence} className={`feed-row fs-${e.status}`}>
            <span className="mono muted small">#{e.sequence}</span>
            <span className="feed-agent">{e.agentId ? AGENT_LABEL[e.agentId] : "System"}</span>
            <span className="feed-msg">{e.message}{e.metadata.cached ? " · shared" : ""}</span>
          </div>
        ))}
        {!shown.length && <Empty>Waiting for the agents to start…</Empty>}
      </div>
    </Card>
  );
}

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const SEV_COLORS = { critical: "#C2412D", high: "#D9682B", medium: "#C98A1B", low: "#A8A29A" } as const;

function ReportView({ report }: { report: Report }) {
  const [sev, setSev] = useState<"all" | Finding["severity"]>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [showHyp, setShowHyp] = useState(false);
  const findings = [...report.findings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const hypCount = findings.filter((f) => f.verification === "hypothesis").length;
  const shown = findings.filter((f) => (sev === "all" || f.severity === sev) && (showHyp || f.verification !== "hypothesis"));
  const sevData = (Object.keys(SEV_ORDER) as Finding["severity"][]).map((s) => ({ name: s, value: findings.filter((f) => f.severity === s).length })).filter((d) => d.value);
  const verified = findings.filter((f) => f.verification === "verified").length;
  const goTo = (fid: string) => { setSev("all"); setOpen(fid); if (findings.find((f) => f.id === fid)?.verification === "hypothesis") setShowHyp(true); setTimeout(() => document.getElementById(`f-${fid}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };

  return (
    <div className="report">
      <Explain title="How to read this report">
        Start with the <strong>executive summary</strong>, then the <strong>recommended actions</strong> (“Do now” first). Each recommendation lists the findings
        it is based on; click one to jump to its evidence. <strong>Verified facts</strong> were seen directly in the data; <strong>hypotheses</strong> are only guesses and are hidden by default.
      </Explain>
      <div className="report-head">
        <span className="eyebrow">Engineering briefing · {report.status === "partial" ? "partial report" : "complete report"}</span>
        <DemoBadge show={report.dataProvenance.containsDemoData} />
      </div>
      <div className="grid-2">
        <Card title="Executive summary" action={<span className={`src-tag ${report.executiveSummarySource}`}>{report.executiveSummarySource === "model" ? "✦ Written by Gemini from verified findings" : "Rules-based summary"}</span>}>
          <p className="summary">{report.executiveSummary}</p>
          <div className="budget-row">
            <Budget label="AI calls" used={report.budgets.modelCallsUsed} limit={report.budgets.modelCallLimit} />
            <Budget label="Data calls" used={report.budgets.toolCallsUsed} limit={report.budgets.toolCallLimit} />
          </div>
        </Card>
        {report.health && (
          <Card title="Health at the time of the report" action={<StatusBadge status={report.health.status} />}>
            <div className="health-hero"><HealthGauge score={report.health.score} status={report.health.status} size={150} />
              <CategoryBars subScores={(["delivery", "ci", "bugs", "pullRequests", "activity"] as const).map((k) => ({ category: k, score: report.health!.categoryScores[k] ?? null, reason: null }))} />
            </div>
          </Card>
        )}
      </div>

      <Card title={`Recommended next actions (${report.recommendations.length})`}>
        {report.recommendations.length ? report.recommendations.map((r) => (
          <div key={r.id} className={`rec p-${r.priority}`}>
            <span className="prio">{r.priority === "now" ? "Do now" : r.priority === "soon" ? "This week" : "Later"}</span>
            <div className="rec-body">
              <div className="strong">{r.title}</div>
              <div className="muted small">{r.rationale}</div>
              <div className="cites">Based on: {r.findingIds.map((fid) => <button key={fid} className="cite" onClick={() => goTo(fid)}>{findings.find((f) => f.id === fid)?.title ?? fid}</button>)}</div>
            </div>
          </div>
        )) : <Empty>No recommendations: nothing verified was severe enough.</Empty>}
      </Card>

      <Card title={`Findings (${findings.length}) · ${verified} verified against retrieved data`}>
        <div className="findings-top">
          <ResponsiveContainer width={140} height={140}>
            <PieChart><Pie data={sevData} dataKey="value" innerRadius={40} outerRadius={62} stroke="none">{sevData.map((d) => <Cell key={d.name} fill={SEV_COLORS[d.name as keyof typeof SEV_COLORS]} />)}</Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
          <div>
            <div className="tabs">
              {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
                <button key={s} className={`tab ${sev === s ? "on" : ""}`} onClick={() => setSev(s)}>{s === "all" ? `All (${findings.length})` : `${s} (${findings.filter((f) => f.severity === s).length})`}</button>
              ))}
            </div>
            {hypCount > 0 && <label className="check hyp-toggle"><input type="checkbox" checked={showHyp} onChange={(e) => setShowHyp(e.target.checked)} /> Show hypotheses ({hypCount}): possible relationships, not confirmed</label>}
            <p className="muted small">Verified facts are observed directly; rule-based inferences are derived by fixed rules; hypotheses are unconfirmed and never drive recommendations. Click a row to see its evidence.</p>
          </div>
        </div>
        <div className="table-wrap"><table className="table findings">
          <thead><tr><th>Severity</th><th>Type</th><th>Finding</th><th>Agent</th><th>Evidence</th></tr></thead>
          <tbody>
            {!shown.length && <tr><td colSpan={5}><Empty>No findings in this view.</Empty></td></tr>}
            {shown.map((f) => (
              <FindingRow key={f.id} f={f} open={open === f.id} toggle={() => setOpen(open === f.id ? null : f.id)} />
            ))}
          </tbody>
        </table></div>
      </Card>

      {(report.unavailableData.length > 0 || report.warnings.length > 0) && (
        <div className="grid-2">
          {report.unavailableData.length > 0 && <Card title="Data the agents could not check"><ul className="plain">{report.unavailableData.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>}
          {report.warnings.length > 0 && <Card title="Notes and warnings"><ul className="plain">{report.warnings.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>}
        </div>
      )}
    </div>
  );
}

function FindingRow({ f, open, toggle }: { f: Finding; open: boolean; toggle: () => void }) {
  return (
    <>
      <tr id={`f-${f.id}`} className={`clickable ${open ? "row-open" : ""} ${f.verification === "unverified" ? "dim" : ""}`} onClick={toggle}>
        <td><SeverityBadge severity={f.severity} /></td>
        <td><KindBadge kind={f.kind} verification={f.verification} /></td>
        <td><div className="strong">{f.title}</div><div className="muted small">{f.description}</div></td>
        <td className="muted">{AGENT_LABEL[f.agentId] ?? f.agentId}</td>
        <td className="mono small">{f.evidence.length} {open ? "▴" : "▾"}</td>
      </tr>
      {open && (
        <tr className="evidence-row"><td colSpan={5}>
          <div className="evidence">
            {f.evidence.map((e, i) => (
              <div key={i} className="ev">
                <span className="mono small">{e.sourceType}:{e.sourceId}</span>
                {e.sourceUrl ? <a href={e.sourceUrl} target="_blank" rel="noreferrer">open source ↗</a> : <span className="muted small">stored record</span>}
                <span className="muted small ev-details">{Object.entries(e.details).slice(0, 4).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")}</span>
              </div>
            ))}
            {f.limitations.length > 0 && <div className="muted small">Limitations: {f.limitations.join(" ")}</div>}
            {(f.reviewNotes?.length ?? 0) > 0 && <div className="muted small">Review notes: {f.reviewNotes!.join(" ")}</div>}
          </div>
        </td></tr>
      )}
    </>
  );
}

function Budget({ label, used, limit }: { label: string; used: number; limit: number }) {
  return (
    <div className="budget"><span className="label">{label}</span>
      <div className="mini-bar wide"><div style={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%`, background: "#E8642C" }} /></div>
      <span className="mono small">{used} / {limit}</span></div>
  );
}
