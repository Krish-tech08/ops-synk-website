import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../components/ui";
import { AgentGraph, FlowStrip, agentDescription, agentTitle, useDemoRun } from "../components/viz";

/* Everything on this page is an illustration for learning. It never shows or changes real data. */

export function LearnPage() {
  const chapters = [["loop", "1. What is DevOps?"], ["pipeline", "2. CI/CD pipeline"], ["prs", "3. Pull requests"], ["opssynk", "4. How OpsSynk helps"], ["glossary", "5. Glossary"]];
  return (
    <div className="page learn">
      <div className="learn-hero">
        <div className="eyebrow">Interactive guide · no technical background needed</div>
        <h1>DevOps in 5 minutes</h1>
        <p className="lead">Software teams constantly write, test and release code. <strong>DevOps</strong> is the practice of making that cycle fast and reliable.
          OpsSynk watches the cycle and tells managers, in plain language, where it is getting stuck.</p>
        <nav className="chapters">{chapters.map(([id, t]) => <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}>{t}</a>)}</nav>
        <div className="sim-note">🧪 Everything on this page is an illustration. Click, drag and press buttons freely; nothing here touches real data.</div>
      </div>

      <section id="loop"><Card title="1 · The DevOps loop: software is never “finished”"><DevOpsLoop /></Card></section>
      <section id="pipeline"><Card title="2 · CI/CD: the automatic quality gate"><PipelineSimulator /></Card></section>
      <section id="prs"><Card title="3 · Pull requests: how code changes get reviewed"><PrLifecycle /></Card></section>
      <section id="opssynk"><OpsSynkSection /></section>
      <section id="glossary"><Card title="5 · Glossary: every term used in this dashboard"><Glossary /></Card></section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. DevOps infinity loop                                             */
/* ------------------------------------------------------------------ */

const STAGES = [
  { name: "Plan", icon: "🗺", side: "dev", plain: "Decide what to build next: features, fixes, deadlines. Work is split into tasks.", analogy: "Choosing tonight’s menu.", opssynk: "The Project agent checks tasks: overdue, blocked or unassigned work lowers the Delivery score." },
  { name: "Code", icon: "⌨", side: "dev", plain: "Developers write the code on a separate copy (a “branch”) and propose it as a pull request.", analogy: "Writing the recipes.", opssynk: "The GitHub agent tracks pull requests; ones left waiting 7+ days are flagged as stale." },
  { name: "Build", icon: "🧱", side: "dev", plain: "A computer automatically turns source code into a runnable app. If it can’t, the build fails.", analogy: "Cooking the ingredients into a dish.", opssynk: "The DevOps agent reads every automated build result (CI runs)." },
  { name: "Test", icon: "🧪", side: "dev", plain: "Automated tests check that everything still works. A failing test blocks the change.", analogy: "The chef tastes the dish before it leaves the kitchen.", opssynk: "Failed test runs lower the CI/CD score; repeated failures are highlighted." },
  { name: "Release", icon: "🏷", side: "ops", plain: "A tested version is approved and packaged for customers.", analogy: "Approving the dish for the menu.", opssynk: "Merged pull requests show work actually being completed." },
  { name: "Deploy", icon: "🚀", side: "ops", plain: "The new version is installed on the servers customers use.", analogy: "Serving the dish to customers.", opssynk: "The DevOps agent reads deployment records, and says “not assessed” if there are none." },
  { name: "Operate", icon: "🖥", side: "ops", plain: "Keep the live system running: servers, uptime, handling incidents.", analogy: "Running the dining room smoothly.", opssynk: "Incidents can be reported and handed straight to the AI to investigate." },
  { name: "Monitor", icon: "📈", side: "ops", plain: "Watch for errors and user feedback. Problems become bug reports, which feed the next Plan.", analogy: "Reading customer reviews.", opssynk: "The Bug agent counts open bugs by severity; critical ones weigh heavily." },
] as const;

function DevOpsLoop() {
  const W = 680, H = 300, cx = W / 2, cy = H / 2, a = 290;
  const f = (t: number) => { const d = 1 + Math.sin(t) ** 2; return { x: cx + (a * Math.cos(t)) / d, y: cy + (a * Math.sin(t) * Math.cos(t)) / d }; };
  const path = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) { const p = f(Math.PI / 2 + (i / 240) * 2 * Math.PI); pts.push(`${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`); }
    return pts.join(" ");
  }, []);
  const stageT = (k: number) => Math.PI / 2 + ((k + 0.5) * Math.PI) / 4;
  const [p, setP] = useState(0.5 / 8);
  const [playing, setPlaying] = useState(true);
  const raf = useRef(0);
  useEffect(() => {
    if (!playing || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let last = performance.now();
    const tick = (now: number) => { setP((v) => (v + (now - last) / 20000) % 1); last = now; raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);
  const active = Math.floor(p * 8) % 8;
  const dot = f(Math.PI / 2 + p * 2 * Math.PI);
  const s = STAGES[active];

  return (
    <div className="loop-wrap">
      <div className="loop-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="loop-svg" role="img" aria-label="DevOps infinity loop with eight stages">
          <path d={path} fill="none" stroke="#EFE8DE" strokeWidth="26" strokeLinecap="round" />
          <path d={path} fill="none" stroke="url(#loopgrad)" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" />
          <defs><linearGradient id="loopgrad" x1="0" x2="1"><stop offset="0" stopColor="#3B6EA8" /><stop offset="1" stopColor="#E8642C" /></linearGradient></defs>
          <text x={cx - a * 0.58} y={cy + 5} textAnchor="middle" className="loop-side" fill="#3B6EA8">DEV</text>
          <text x={cx + a * 0.58} y={cy + 5} textAnchor="middle" className="loop-side" fill="#E8642C">OPS</text>
          {STAGES.map((st, k) => {
            const pt = f(stageT(k));
            const lobe = { x: k < 4 ? cx - a * 0.58 : cx + a * 0.58, y: cy };
            const dx = pt.x - lobe.x, dy = pt.y - lobe.y, len = Math.hypot(dx, dy) || 1;
            const lx = pt.x + (dx / len) * 34, ly = pt.y + (dy / len) * 30;
            const on = k === active;
            const col = st.side === "dev" ? "#3B6EA8" : "#E8642C";
            return (
              <g key={st.name} className="loop-stage" onClick={() => { setPlaying(false); setP((k + 0.5) / 8); }} tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") { setPlaying(false); setP((k + 0.5) / 8); } }}>
                <circle cx={pt.x} cy={pt.y} r={on ? 20 : 15} fill={on ? col : "#fff"} stroke={col} strokeWidth="2.5" style={{ transition: "r .25s, fill .25s" }} />
                <text x={pt.x} y={pt.y + 5} textAnchor="middle" fontSize={on ? 16 : 13}>{st.icon}</text>
                <text x={lx} y={ly + 4} textAnchor="middle" fontSize="13" fontWeight={on ? 800 : 600} fill={on ? col : "#4A453E"}>{st.name}</text>
              </g>
            );
          })}
          <circle cx={dot.x} cy={dot.y} r="7" fill="#1F1D1A" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <div className="row center-row">
          <button className="btn small" onClick={() => setPlaying(!playing)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
          <button className="btn small ghost" onClick={() => { setPlaying(false); setP(((active + 7) % 8 + 0.5) / 8); }}>‹ Prev</button>
          <button className="btn small ghost" onClick={() => { setPlaying(false); setP(((active + 1) % 8 + 0.5) / 8); }}>Next ›</button>
          <span className="muted small">or click any stage</span>
        </div>
      </div>
      <div className={`loop-panel side-${s.side}`} key={s.name}>
        <div className="eyebrow">{s.side === "dev" ? "Development side" : "Operations side"} · stage {active + 1} of 8</div>
        <h2 className="loop-title">{s.icon} {s.name}</h2>
        <p>{s.plain}</p>
        <div className="loop-analogy"><span className="label">🍽 Restaurant analogy</span><div>{s.analogy}</div></div>
        <div className="loop-ops"><span className="label">🔎 What OpsSynk checks here</span><div>{s.opssynk}</div></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. CI/CD pipeline simulator                                         */
/* ------------------------------------------------------------------ */

type St = "idle" | "running" | "ok" | "fail" | "skip";
const PIPE = [
  { name: "Commit", icon: "💾", text: "A developer saves a change and pushes it to GitHub." },
  { name: "Build", icon: "🧱", text: "The code is compiled into a runnable app." },
  { name: "Test", icon: "🧪", text: "Hundreds of automated checks run in seconds." },
  { name: "Deploy", icon: "🚀", text: "The new version is installed on the servers." },
  { name: "Live", icon: "🌍", text: "Customers are using the new version." },
];

function PipelineSimulator() {
  const [states, setStates] = useState<St[]>(PIPE.map(() => "idle"));
  const [bug, setBug] = useState(false);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Array<"ok" | "fail">>([]);
  const [msg, setMsg] = useState<{ tone: "ok" | "fail" | "info"; text: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function run() {
    setRunning(true); setMsg({ tone: "info", text: "Pipeline started: the robot is checking the change…" });
    const st: St[] = PIPE.map(() => "idle");
    for (let i = 0; i < PIPE.length; i++) {
      st[i] = "running"; if (!alive.current) return; setStates([...st]);
      await sleep(i === 2 ? 1400 : 850);
      if (i === 2 && bug) {
        st[i] = "fail"; for (let j = i + 1; j < PIPE.length; j++) st[j] = "skip";
        if (!alive.current) return;
        setStates([...st]); setHistory((h) => [...h, "fail" as const].slice(-12)); setRunning(false);
        setMsg({ tone: "fail", text: "❌ Test failed. The bug was caught automatically, before any customer saw it. This is a “CI failure”: it is a good catch, but if it keeps happening, the team has a quality problem. OpsSynk counts these failures." });
        return;
      }
      st[i] = "ok";
    }
    if (!alive.current) return;
    setStates([...st]); setHistory((h) => [...h, "ok" as const].slice(-12)); setRunning(false);
    setMsg({ tone: "ok", text: "✅ All checks passed and the change is live, with zero manual steps. This is CD (Continuous Delivery)." });
  }

  const passes = history.filter((h) => h === "ok").length;
  const rate = history.length ? Math.round((passes / history.length) * 100) : null;
  const pos = Math.max(0, states.findIndex((s) => s === "running" || s === "fail"));
  const lastDone = states.lastIndexOf("ok");
  const tokenAt = running ? pos : states.includes("fail") ? states.indexOf("fail") : lastDone >= 0 ? lastDone : 0;

  return (
    <div className="pipesim">
      <p className="muted">Every time a developer changes code, a robot (the <strong>CI/CD pipeline</strong>) automatically builds, tests and releases it.
        <strong> Try it:</strong> push a change, then switch on “include a bug” and push again.</p>
      <div className="ps-track">
        <div className="ps-token" style={{ left: `${((tokenAt + 0.5) / PIPE.length) * 100}%` }}>{states.includes("fail") && !running ? "🐞" : "📦"}</div>
        {PIPE.map((p, i) => (
          <div key={p.name} className="ps-col">
            <div className={`ps-stage ps-${states[i]}`}>
              <span className="ps-icon">{states[i] === "ok" ? "✓" : states[i] === "fail" ? "✕" : states[i] === "running" ? <span className="spinner light" /> : p.icon}</span>
            </div>
            <div className="ps-name">{p.name}</div>
            <div className="ps-text muted small">{p.text}</div>
            {i < PIPE.length - 1 && <div className={`ps-line ${states[i] === "ok" ? "lit" : ""}`} />}
          </div>
        ))}
      </div>
      <div className="row ps-controls">
        <button className="btn primary" disabled={running} onClick={() => void run()}>{running ? "Running…" : "⬆ Push a code change"}</button>
        <label className={`toggle ${bug ? "on" : ""}`}><input type="checkbox" checked={bug} disabled={running} onChange={(e) => setBug(e.target.checked)} /><span className="toggle-track"><span /></span>🐞 Include a bug</label>
        {history.length > 0 && <button className="btn small ghost" disabled={running} onClick={() => { setHistory([]); setStates(PIPE.map(() => "idle")); setMsg(null); }}>Reset</button>}
      </div>
      {msg && <div className={`ps-msg ps-msg-${msg.tone}`}>{msg.text}</div>}
      <div className="ps-history">
        <div><span className="label">Run history</span>
          <div className="ps-squares">{history.length ? history.map((h, i) => <span key={i} className={`sq sq-${h}`} title={h === "ok" ? "passed" : "failed"} />) : <span className="muted small">No runs yet. Push a change!</span>}</div>
        </div>
        <div className="ps-rate"><span className="label">CI pass rate</span>
          <div className="ps-rate-val" style={{ color: rate === null ? "#8A8F98" : rate >= 80 ? "#3F7D58" : rate >= 50 ? "#C98A1B" : "#C2412D" }}>{rate === null ? "—" : `${rate}%`}</div>
          <span className="muted small">This is exactly how the dashboard’s <strong>CI/CD score</strong> and <strong>CI pass rate</strong> are measured, using real runs from GitHub.</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Pull-request lifecycle + staleness                               */
/* ------------------------------------------------------------------ */

const PR_STEPS = [
  { name: "Branch", text: "The developer makes a private copy of the code (a “branch”) so they can work without breaking the main version." },
  { name: "Commit", text: "They save their changes in small steps called commits." },
  { name: "Open PR", text: "They open a Pull Request (PR): “please review my changes and pull them into the main code”." },
  { name: "Review", text: "A teammate reads the changes, asks questions or approves. Automated tests also run on the PR." },
  { name: "Merge", text: "Once approved, the branch is merged: the changes become part of the main code." },
];

function PrLifecycle() {
  const [step, setStep] = useState(0);
  const [days, setDays] = useState(2);
  const vis = (n: number) => (step >= n ? 1 : 0.12);
  const stale = days >= 7;
  const tone = days >= 14 ? "#C2412D" : stale ? "#C98A1B" : "#3F7D58";
  return (
    <div className="pr-wrap">
      <div className="pr-graph-col">
        <svg viewBox="0 0 640 170" className="pr-svg" role="img" aria-label="Git branch diagram">
          <text x="10" y="128" fontSize="11" fill="#6E685F" fontWeight="700">main</text>
          <line x1="50" y1="124" x2="620" y2="124" stroke="#3B6EA8" strokeWidth="4" strokeLinecap="round" />
          {[80, 150, 580].map((x) => <circle key={x} cx={x} cy="124" r="8" fill="#fff" stroke="#3B6EA8" strokeWidth="3" />)}
          <g style={{ opacity: vis(0), transition: "opacity .4s" }}>
            <path d="M150 124 C190 124, 190 50, 230 50" fill="none" stroke="#E8642C" strokeWidth="4" />
            <text x="236" y="32" fontSize="11" fill="#E8642C" fontWeight="700">feature branch</text>
          </g>
          <g style={{ opacity: vis(1), transition: "opacity .4s" }}>
            <line x1="230" y1="50" x2="420" y2="50" stroke="#E8642C" strokeWidth="4" />
            {[260, 320, 380].map((x) => <circle key={x} cx={x} cy="50" r="8" fill="#fff" stroke="#E8642C" strokeWidth="3" />)}
          </g>
          <g style={{ opacity: vis(2), transition: "opacity .4s" }}>
            <rect x="395" y="64" width="86" height="26" rx="13" fill="#FCEBE2" stroke="#E8642C" />
            <text x="438" y="81" fontSize="11" textAnchor="middle" fill="#E8642C" fontWeight="700">PR #42</text>
          </g>
          <g style={{ opacity: vis(3), transition: "opacity .4s" }}>
            <text x="456" y="44" fontSize="18">👀</text><text x="482" y="44" fontSize="18">✅</text>
          </g>
          <g style={{ opacity: vis(4), transition: "opacity .4s" }}>
            <path d="M420 50 C470 50, 490 124, 530 124" fill="none" stroke="#E8642C" strokeWidth="4" />
            <circle cx="530" cy="124" r="10" fill="#3F7D58" stroke="#fff" strokeWidth="3" />
            <text x="530" y="152" fontSize="11" textAnchor="middle" fill="#3F7D58" fontWeight="700">merged</text>
          </g>
        </svg>
        <div className="stepper">
          {PR_STEPS.map((s, i) => <button key={s.name} className={`step-dot ${i <= step ? "on" : ""}`} onClick={() => setStep(i)}><span>{i + 1}</span>{s.name}</button>)}
        </div>
        <div className="pr-text"><strong>{PR_STEPS[step].name}:</strong> {PR_STEPS[step].text}</div>
        <div className="row"><button className="btn small" disabled={step === 0} onClick={() => setStep(step - 1)}>‹ Back</button>
          <button className="btn small primary" onClick={() => setStep((step + 1) % PR_STEPS.length)}>{step === PR_STEPS.length - 1 ? "↺ Start over" : "Next step ›"}</button></div>
      </div>

      <div className="stale-box">
        <div className="label">What is a “stale” PR?</div>
        <p className="small">Sometimes step 4 (review) never happens. The PR just sits there and the work is stuck. Drag the slider:</p>
        <div className="pr-card" style={{ borderColor: tone }}>
          <div className="row"><strong>PR #42 · Add login page</strong><span className="badge" style={{ color: "#fff", background: tone }}>{days >= 14 ? "very stale" : stale ? "stale" : "active"}</span></div>
          <div className="muted small">⏱ last activity {days === 0 ? "today" : `${days} day${days > 1 ? "s" : ""} ago`}</div>
          <div className="stale-meter"><div style={{ width: `${(days / 21) * 100}%`, background: tone }} /><span className="stale-mark" style={{ left: `${(7 / 21) * 100}%` }}>7 days</span></div>
        </div>
        <input type="range" min={0} max={21} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days without activity" style={{ accentColor: tone }} />
        <p className="small" style={{ color: tone, fontWeight: 600 }}>
          {stale ? "OpsSynk flags this PR as stale: the developer is blocked, and finished work isn’t reaching customers. Too many stale PRs lower the Pull-requests score." : "Fine: the PR is still being actively worked on."}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. How OpsSynk works                                                */
/* ------------------------------------------------------------------ */

function OpsSynkSection() {
  const demo = useDemoRun();
  const [sel, setSel] = useState<string | null>("manager");
  return (
    <div className="page" style={{ gap: 18 }}>
      <Card title="4 · How OpsSynk turns all of this into answers">
        <FlowStrip steps={[
          { icon: "🐙", title: "GitHub & project data", text: "OpsSynk reads (never writes) pull requests, build results, bugs, commits, and the team’s tasks and deadlines." },
          { icon: "📐", title: "Fixed scoring rules", text: "Plain code, not AI, turns the raw data into five scores (delivery, CI/CD, bugs, pull requests, activity), so the numbers are repeatable and auditable." },
          { icon: "❤️", title: "Health score", text: "The five scores are weighted and combined into one 0–100 number per project and for the whole company: green, amber or red." },
          { icon: "🤖", title: "AI agents investigate", text: "When you ask a question, six specialised AI agents dig into the data, and every claim must cite real evidence." },
          { icon: "📄", title: "Plain-language report", text: "Managers get a summary, the proof behind it, and a prioritised to-do list, without reading any code." },
        ]} />
      </Card>
      <Card title="Meet the six AI agents" action={
        <div className="row">{demo.running ? <span className="muted small"><span className="pulse" /> demo running…</span> : null}
          <button className="btn small primary" disabled={demo.running} onClick={() => { demo.reset(); setTimeout(demo.start, 50); }}>▶ Watch a demo run</button></div>}>
        <AgentGraph statuses={demo.statuses} selected={sel} onSelect={setSel} />
        {demo.caption ? <div className="graph-caption">{demo.caption}</div> :
          sel && <div className="graph-caption"><strong>{agentTitle(sel)}:</strong> {agentDescription(sel)} <span className="muted small">(click any box)</span></div>}
        <p className="muted small">Like a team of specialists: a manager splits the job, experts each check their own area, a reviewer double-checks the facts, and the manager writes it up.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Glossary                                                         */
/* ------------------------------------------------------------------ */

const TERMS: Array<{ t: string; d: string; e: string }> = [
  { t: "DevOps", d: "Development + Operations: one team that both builds software and keeps it running, using automation to release often and safely.", e: "Instead of one big release a year, ship small updates every day." },
  { t: "Repository (repo)", d: "A project’s folder of code stored on GitHub, with the full history of every change.", e: "“checkout-service” holds all the code for the checkout page." },
  { t: "Commit", d: "One saved change to the code, with a message describing it.", e: "“Fix typo on login button”" },
  { t: "Branch", d: "A separate copy of the code where a developer works without affecting the main version.", e: "feature/login-page" },
  { t: "Pull request (PR)", d: "A request to merge a branch into the main code. Teammates review it first.", e: "PR #42: Add login page, waiting for review" },
  { t: "Stale PR", d: "A pull request with no activity for 7+ days. Work is stuck.", e: "Nobody has reviewed PR #42 for two weeks." },
  { t: "Merge", d: "Accepting a pull request, so its changes join the main code.", e: "PR #42 merged into main." },
  { t: "CI (Continuous Integration)", d: "Automatically building and testing every change as soon as it is pushed.", e: "Every push triggers 500 tests in 3 minutes." },
  { t: "CD (Continuous Delivery/Deployment)", d: "Automatically releasing changes that pass CI to the live servers.", e: "Passing changes go live within an hour." },
  { t: "Pipeline / workflow run", d: "One execution of the automated build-test-deploy steps. It passes or fails.", e: "Run #1287: failed at “unit tests”." },
  { t: "Build", d: "Turning source code into a runnable application.", e: "Build failed: missing file." },
  { t: "Deployment", d: "Installing a new version of the software on servers users access.", e: "v2.3 deployed to production." },
  { t: "Production", d: "The live environment real customers use (as opposed to testing environments).", e: "The bug only happens in production." },
  { t: "Bug / issue", d: "A recorded problem or task in GitHub. Bugs are issues labelled as defects.", e: "Issue #88: Cart total wrong (critical)" },
  { t: "Incident", d: "Something going wrong in production right now that affects users.", e: "Checkout is down for 10% of users." },
  { t: "Severity (Sev 1–4)", d: "How serious an incident or bug is. Sev 1 = critical outage, Sev 4 = minor.", e: "Sev 1: payments failing for everyone." },
  { t: "Health score", d: "OpsSynk’s 0–100 rating of how smoothly a project’s engineering is going, from five weighted areas.", e: "82 = healthy, 64 = warning, 35 = critical." },
  { t: "AI agent", d: "An AI program with one specific job and limited, read-only tools.", e: "The Bug agent only looks at bug reports." },
  { t: "Evidence", d: "The exact data item (PR, run, issue, task) a finding is based on, with a link.", e: "Finding cites “workflow run #1287”." },
  { t: "Hypothesis", d: "A possible explanation the agents could not confirm. Never used for recommendations.", e: "“These two bugs may share a cause.”" },
];

function Glossary() {
  const [qy, setQy] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = TERMS.filter((x) => (x.t + x.d).toLowerCase().includes(qy.toLowerCase()));
  return (
    <div>
      <input className="search" placeholder="Search a term… e.g. “PR”" value={qy} onChange={(e) => setQy(e.target.value)} style={{ maxWidth: 320, marginBottom: 12 }} />
      <div className="gloss-grid">
        {shown.map((x) => (
          <button key={x.t} className={`gloss ${open === x.t ? "open" : ""}`} onClick={() => setOpen(open === x.t ? null : x.t)}>
            <div className="gloss-t">{x.t}</div>
            <div className="gloss-d">{x.d}</div>
            {open === x.t ? <div className="gloss-e">Example: {x.e}</div> : <div className="gloss-more">example ▾</div>}
          </button>
        ))}
        {!shown.length && <div className="empty">No matching term.</div>}
      </div>
    </div>
  );
}
