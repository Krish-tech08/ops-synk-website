import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AgentGraph, agentDescription, agentTitle, useDemoRun } from "../components/viz";
import { Explain } from "../lib/explain";
import { Card, ErrorBox, Loading } from "../components/ui";
import { AGENT_LABEL, AGENT_ROLE } from "../lib/format";
import { useAuth, friendlyAuthError } from "../lib/auth";
import { config } from "../config";

export function AgentsPage() {
  const demo = useDemoRun();
  const [sel, setSel] = useState<string | null>("manager");
  const rules = [
    ["Numbers come from code, not AI", "Health scores, counts, staleness and CI rates are calculated by fixed, documented rules. Gemini only plans, summarises and drafts recommendations."],
    ["Every claim has evidence", "Agents collect data through approved read-only tools. Each finding cites the exact pull request, issue, workflow run or task it is based on."],
    ["Evidence is double-checked", "Before the report is written, every cited item is checked against what was actually retrieved. Anything that doesn’t match is marked unverified and can’t become a recommendation."],
    ["Hypotheses stay hypotheses", "Similar-looking bugs are flagged as possibly related, never as a confirmed shared cause."],
    ["Honest about gaps", "Missing or failing data is listed under “Data the agents could not check”. Without deployment records, deployment health is reported as not assessed."],
    ["Bounded and safe", "Each investigation has a cap on AI calls and data calls and a time limit. GitHub access is read-only, and AI keys stay on the server."],
  ];
  return (
    <div className="page">
      <div className="page-head"><div><h1>How the agents work</h1><p className="muted">Six small specialist agents cooperate on each investigation.</p></div></div>
      <Explain>An <strong>AI agent</strong> is an AI program with one narrow job and limited, read-only access. Instead of one big AI guessing,
        OpsSynk uses a <em>team</em>: a manager, four specialists and a fact-checker, like a hospital with a GP, specialists and a second-opinion doctor.
        Press <strong>Play animation</strong> to see the hand-offs.</Explain>
      <div className="agent-grid">
        {Object.keys(AGENT_LABEL).map((a, i) => (
          <Card key={a}><div className="agent-num">{i + 1}</div><h3>{AGENT_LABEL[a]} agent</h3><p className="muted">{AGENT_ROLE[a]}</p></Card>
        ))}
      </div>
      <Card title="How a question flows through the agents" action={
        <button className="btn small primary" disabled={demo.running} onClick={() => { demo.reset(); setTimeout(demo.start, 50); }}>{demo.running ? "Running…" : "▶ Play animation"}</button>}>
        <AgentGraph statuses={demo.statuses} selected={sel} onSelect={setSel} />
        <div className="graph-caption">{demo.caption || (sel ? <><strong>{agentTitle(sel)}:</strong> {agentDescription(sel)}</> : "Click any box to learn what it does.")}</div>
        <p className="muted small">Illustration of a typical run. Open any real investigation to watch this graph light up live.</p>
      </Card>
      <div className="grid-3">{rules.map(([t, d]) => <Card key={t} title={t}><p className="muted">{d}</p></Card>)}</div>
    </div>
  );
}

interface Ready { status: string; checks: Record<string, string>; modes: Record<string, string | boolean> }
export function SettingsPage() {
  const { user } = useAuth();
  const [r, setR] = useState<Ready | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function check() {
    setLoading(true); setErr(null);
    try { const res = await fetch(`${config.apiBaseUrl}/ready`); setR(await res.json()); } catch { setErr("Can't reach the server."); } finally { setLoading(false); }
  }
  useEffect(() => { void check(); }, []);
  const label: Record<string, string> = { ok: "Connected", degraded: "Demo dataset", not_configured: "Not configured (rules-only)", unavailable: "Unavailable" };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Settings & status</h1></div><button className="btn" onClick={() => void check()}>Re-check</button></div>
      <div className="grid-2">
        <Card title="Server status">
          {loading ? <Loading /> : err ? <ErrorBox message={err} /> : r && (
            <div className="status-list">
              <div><span>Overall</span><strong className={r.status === "ready" ? "ok" : "warn"}>{r.status === "ready" ? "Ready" : "Not ready"}</strong></div>
              {Object.entries(r.checks).map(([k, v]) => <div key={k}><span>{k === "storage" ? "Database (Firestore)" : k === "github" ? "GitHub data" : "Gemini AI"}</span><strong className={v === "ok" ? "ok" : "warn"}>{label[v] ?? v}</strong></div>)}
              <div><span>GitHub data source</span><strong>{String(r.modes.githubData) === "github" ? "Live GitHub" : "Demo fixtures"}</strong></div>
            </div>
          )}
        </Card>
        <Card title="This dashboard">
          <div className="status-list">
            <div><span>Signed in as</span><strong>{user?.email}</strong></div>
            <div><span>Organization</span><strong className="mono">{config.organizationId}</strong></div>
            <div><span>API</span><strong className="mono small">{config.apiBaseUrl}</strong></div>
            <div><span>Sign-in</span><strong>{config.authMode === "dev" ? "Development token" : "Firebase"}</strong></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dev = config.authMode === "dev";
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await signIn(email, password); } catch (err) { setError(friendlyAuthError(err)); setBusy(false); }
  }
  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="brand big"><span className="logo">✓</span> OpsSynk</div>
        <p className="muted">AI-powered engineering command center</p>
        {dev ? (<>
          <label className="field-label">Development user ID</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="demo-owner" />
          <p className="muted small">Local development mode. The deployed server only accepts Firebase sign-in.</p>
        </>) : (<>
          <label className="field-label">Email</label><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="field-label">Password</label><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </>)}
        {error && <div className="error-box">{error}</div>}
        <button className="btn primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <Link to="/learn" className="login-learn">🎓 New to DevOps? Open the 5-minute visual guide →</Link>
      </form>
    </div>
  );
}
