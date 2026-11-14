import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Category } from "../lib/api";
import { AGENT_LABEL, AGENT_ROLE, CATEGORY_LABEL, STATUS_COLOR, scoreColor } from "../lib/format";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** True after the first paint, so CSS transitions can animate from zero. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setM(true)); return () => cancelAnimationFrame(id); }, []);
  return m;
}

/** Number that counts up to its value. Non-numeric values render as-is. */
export function CountUp({ value, duration = 900 }: { value: ReactNode; duration?: number }) {
  const target = typeof value === "number" ? value : null;
  const [shown, setShown] = useState(target === null || reducedMotion() ? target : 0);
  useEffect(() => {
    if (target === null || reducedMotion()) { setShown(target); return; }
    const start = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return <>{target === null ? value : shown}</>;
}

/* ------------------------------------------------------------------ */
/* Health score breakdown + what-if simulator                          */
/* ------------------------------------------------------------------ */

export const CATEGORY_COLOR: Record<Category, string> = {
  delivery: "#3B6EA8", ci: "#E8642C", bugs: "#8E5BB5", pullRequests: "#2E9C8F", activity: "#B8860B",
};
const CATS: Category[] = ["delivery", "ci", "bugs", "pullRequests", "activity"];
const PLAIN: Record<Category, string> = {
  delivery: "Are tasks finished on time, or overdue and blocked?",
  ci: "Do automatic build-and-test runs pass?",
  bugs: "How many known problems are open, and how severe?",
  pullRequests: "Are proposed code changes reviewed quickly, or left waiting?",
  activity: "Is code actually being worked on?",
};

function weighted(scores: Partial<Record<Category, number | null>>, weights: Record<Category, number>) {
  const present = CATS.filter((c) => scores[c] !== null && scores[c] !== undefined);
  const wsum = present.reduce((a, c) => a + weights[c], 0);
  if (!wsum) return { total: null as number | null, parts: [] as Array<{ c: Category; pts: number; max: number }> };
  const parts = present.map((c) => ({ c, pts: (weights[c] / wsum) * (scores[c] as number), max: (weights[c] / wsum) * 100 }));
  return { total: parts.reduce((a, p) => a + p.pts, 0), parts };
}

export function ScoreBreakdown({ categoryScores, weights, score, bands }: {
  categoryScores: Partial<Record<Category, number | null>>; weights: Record<Category, number>; score: number | null; bands: { healthy: number; warning: number };
}) {
  const [whatIf, setWhatIf] = useState(false);
  const [sim, setSim] = useState<Partial<Record<Category, number | null>>>(categoryScores);
  const [hover, setHover] = useState<Category | null>(null);
  const mounted = useMounted();
  useEffect(() => setSim(categoryScores), [categoryScores]);
  const used = whatIf ? sim : categoryScores;
  const { total, parts } = weighted(used, weights);
  const shownTotal = whatIf ? total : score ?? total;
  const status = shownTotal === null ? "insufficient_data" : shownTotal >= bands.healthy ? "healthy" : shownTotal >= bands.warning ? "warning" : "critical";
  const drift = !whatIf && score !== null && total !== null && Math.abs(score - total) > 2;

  return (
    <div className="breakdown">
      <div className="bd-head">
        <div>
          <div className="bd-total" style={{ color: STATUS_COLOR[status] }}>{shownTotal === null ? "—" : Math.round(shownTotal)}<span>/100</span></div>
          <div className="muted small">{whatIf ? "Simulated score" : "Current score"}</div>
        </div>
        <button className={`btn small ${whatIf ? "primary" : ""}`} onClick={() => { setWhatIf(!whatIf); setSim(categoryScores); }}>
          {whatIf ? "↺ Back to real data" : "🎛 Try “what if?”"}
        </button>
      </div>

      {/* Stacked bar: each coloured block is the points a category contributes */}
      <div className="bd-stack" onMouseLeave={() => setHover(null)}>
        {parts.map((p) => (
          <div key={p.c} className={`bd-seg ${hover && hover !== p.c ? "dim" : ""}`} onMouseEnter={() => setHover(p.c)}
            style={{ width: mounted ? `${p.pts}%` : 0, background: CATEGORY_COLOR[p.c] }} title={`${CATEGORY_LABEL[p.c]}: ${p.pts.toFixed(1)} points`} />
        ))}
        <div className="bd-lost" />
        <div className="bd-band" style={{ left: `${bands.warning}%` }}><span>{bands.warning}</span></div>
        <div className="bd-band" style={{ left: `${bands.healthy}%` }}><span>{bands.healthy}</span></div>
      </div>
      <div className="bd-scale"><span style={{ color: STATUS_COLOR.critical }}>Critical</span><span style={{ color: STATUS_COLOR.warning }}>Warning</span><span style={{ color: STATUS_COLOR.healthy }}>Healthy</span></div>

      <div className="bd-rows">
        {CATS.map((c) => {
          const s = used[c];
          const part = parts.find((p) => p.c === c);
          return (
            <div key={c} className={`bd-row ${hover === c ? "hl" : ""}`} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
              <span className="dot" style={{ background: CATEGORY_COLOR[c] }} />
              <div className="bd-name"><strong>{CATEGORY_LABEL[c]}</strong><span className="muted small">{PLAIN[c]}</span></div>
              {whatIf ? (
                <input type="range" min={0} max={100} value={s ?? 0} aria-label={`${CATEGORY_LABEL[c]} score`}
                  onChange={(e) => setSim({ ...sim, [c]: Number(e.target.value) })} style={{ accentColor: CATEGORY_COLOR[c] }} />
              ) : null}
              <span className="bd-math mono">
                {s === null || s === undefined ? "no data" : <>{Math.round(s)} × {Math.round(weights[c] * 100)}% = <strong>{part ? part.pts.toFixed(1) : "0"}</strong> pts</>}
              </span>
            </div>
          );
        })}
      </div>
      <p className="muted small">
        {whatIf ? "Simulation only: drag the sliders to see how improving one area changes the overall score. Nothing is saved." :
          "Each area gets a score out of 100, multiplied by its weight. The coloured blocks add up to the overall score; the grey part is points lost."}
        {drift && " The server averages per project first, so its score can differ slightly from this simplified sum."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Project × dimension heatmap                                         */
/* ------------------------------------------------------------------ */

export function HealthHeatmap({ rows, onOpen }: {
  rows: Array<{ id: string; name: string; score: number | null; cells: Partial<Record<Category, { score: number | null; reason: string | null }>> }>;
  onOpen: (id: string) => void;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; text: ReactNode } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const SHORT = { delivery: "Delivery", ci: "CI/CD", bugs: "Bugs", pullRequests: "Pull requests", activity: "Activity" } as const;
  const show = (e: React.MouseEvent, text: ReactNode) => {
    const r = wrap.current!.getBoundingClientRect();
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text });
  };
  return (
    <div className="heatmap" ref={wrap} onMouseLeave={() => setTip(null)}>
      <div className="hm-grid" style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${CATS.length}, minmax(52px, 1fr)) 64px` }}>
        <div />
        {CATS.map((c) => <div key={c} className="hm-col">{SHORT[c]}</div>)}
        <div className="hm-col">Overall</div>
        {rows.map((r) => (
          <div key={r.id} className="hm-row" onClick={() => onOpen(r.id)}>
            <div className="hm-name" title={r.name}>{r.name}</div>
            {CATS.map((c) => {
              const cell = r.cells[c];
              const s = cell?.score ?? null;
              return (
                <div key={c} className="hm-cell" style={{ background: s === null ? "#EEE9E1" : scoreColor(s), color: s === null ? "#8A8F98" : "#fff" }}
                  onMouseMove={(e) => show(e, <><strong>{r.name} · {CATEGORY_LABEL[c]}</strong><br />{s === null ? "No data" : `${Math.round(s)}/100`}{cell?.reason ? <><br /><span className="muted">{cell.reason}</span></> : null}</>)}>
                  {s === null ? "–" : Math.round(s)}
                </div>
              );
            })}
            <div className="hm-cell hm-total" style={{ color: scoreColor(r.score) }}>{r.score ?? "—"}</div>
          </div>
        ))}
      </div>
      {tip && <div className="hm-tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>{tip.text}</div>}
      <div className="hm-legend">
        <span><i style={{ background: STATUS_COLOR.critical }} />Below 50: critical</span>
        <span><i style={{ background: STATUS_COLOR.warning }} />50–79: warning</span>
        <span><i style={{ background: STATUS_COLOR.healthy }} />80+: healthy</span>
        <span><i style={{ background: "#EEE9E1" }} />No data</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent graph                                                         */
/* ------------------------------------------------------------------ */

type NodeStatus = "pending" | "running" | "completed" | "failed" | "partial" | "skipped";
const NODES: Array<{ id: string; x: number; y: number; icon: string; label: string; sub: string }> = [
  { id: "question", x: 70, y: 170, icon: "❓", label: "Your question", sub: "asked in plain English" },
  { id: "manager", x: 245, y: 170, icon: "🧭", label: "Manager", sub: "makes a plan" },
  { id: "github", x: 460, y: 45, icon: "⑂", label: "GitHub", sub: "code changes" },
  { id: "project", x: 460, y: 128, icon: "📋", label: "Project", sub: "tasks & deadlines" },
  { id: "bug", x: 460, y: 212, icon: "🐞", label: "Bug", sub: "known problems" },
  { id: "devops", x: 460, y: 295, icon: "⚙", label: "DevOps", sub: "builds & deploys" },
  { id: "review", x: 675, y: 170, icon: "🔍", label: "Review / QA", sub: "checks evidence" },
  { id: "report", x: 850, y: 170, icon: "📄", label: "Report", sub: "actions to take" },
];
const EDGES: Array<[string, string]> = [
  ["question", "manager"], ["manager", "github"], ["manager", "project"], ["manager", "bug"], ["manager", "devops"],
  ["github", "review"], ["project", "review"], ["bug", "review"], ["devops", "review"], ["review", "report"],
];
const NODE_W = 132, NODE_H = 52;
const NODE_DESC: Record<string, string> = {
  question: "You ask something like “Which projects are at risk?”. No technical knowledge needed.",
  report: "A written briefing: summary, health score, findings with links to proof, and a prioritised to-do list.",
};
const STATUS_FILL: Record<NodeStatus, string> = { pending: "#FFFFFF", running: "#FFF1E8", completed: "#E7F1EA", failed: "#FDECEA", partial: "#FDF3DD", skipped: "#F4F1EC" };
const STATUS_STROKE: Record<NodeStatus, string> = { pending: "#D9D1C4", running: "#E8642C", completed: "#3F7D58", failed: "#C2412D", partial: "#C98A1B", skipped: "#D9D1C4" };

export function AgentGraph({ statuses, selected, onSelect, height }: {
  statuses: Record<string, NodeStatus>; selected?: string | null; onSelect?: (id: string) => void; height?: number;
}) {
  const pos = useMemo(() => Object.fromEntries(NODES.map((n) => [n.id, n])), []);
  const done = (s?: NodeStatus) => s === "completed" || s === "partial";
  return (
    <svg className="agent-graph" viewBox="0 0 920 340" style={height ? { height } : undefined} role="img" aria-label="Diagram of the six AI agents and how work flows between them">
      <defs>
        <marker id="ag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#C9BFB1" />
        </marker>
      </defs>
      {EDGES.map(([a, b]) => {
        const A = pos[a], B = pos[b];
        const x1 = A.x + NODE_W / 2, x2 = B.x - NODE_W / 2 - 4, mx = (x1 + x2) / 2;
        const d = `M${x1} ${A.y} C${mx} ${A.y}, ${mx} ${B.y}, ${x2} ${B.y}`;
        const sa = statuses[a], sb = statuses[b];
        const flowing = done(sa) && (sb === "running" || done(sb));
        const live = done(sa) && sb === "running";
        return (
          <g key={`${a}-${b}`}>
            <path d={d} fill="none" stroke={flowing ? "#E8642C" : "#DDD5C9"} strokeWidth={flowing ? 2.2 : 1.6} markerEnd="url(#ag-arrow)" />
            {live && <path d={d} fill="none" stroke="#E8642C" strokeWidth={3} className="ag-flow" />}
            {live && !reducedMotion() && (
              <circle r="4.5" fill="#E8642C"><animateMotion dur="1.2s" repeatCount="indefinite" path={d} /></circle>
            )}
          </g>
        );
      })}
      {NODES.map((n) => {
        const st: NodeStatus = statuses[n.id] ?? "pending";
        const sel = selected === n.id;
        return (
          <g key={n.id} className={`ag-node ${onSelect ? "clickable" : ""} ${st === "running" ? "ag-running" : ""}`} transform={`translate(${n.x - NODE_W / 2} ${n.y - NODE_H / 2})`}
            onClick={() => onSelect?.(n.id)} tabIndex={onSelect ? 0 : undefined} onKeyDown={(e) => { if (e.key === "Enter") onSelect?.(n.id); }}>
            <rect width={NODE_W} height={NODE_H} rx={12} fill={STATUS_FILL[st]} stroke={sel ? "#1F1D1A" : STATUS_STROKE[st]} strokeWidth={sel ? 2.4 : 1.6} />
            <text x={14} y={32} fontSize="18">{n.icon}</text>
            <text x={40} y={23} fontSize="13" fontWeight="700" fill="#1F1D1A">{n.label}</text>
            <text x={40} y={39} fontSize="10.5" fill="#6E685F">{st === "pending" || n.id === "question" ? n.sub : st}</text>
            {st === "completed" && <g transform={`translate(${NODE_W - 12} -6)`}><circle r="9" fill="#3F7D58" /><path d="M-4 0l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" /></g>}
            {st === "failed" && <g transform={`translate(${NODE_W - 12} -6)`}><circle r="9" fill="#C2412D" /><path d="M-3.5 -3.5l7 7M3.5 -3.5l-7 7" stroke="#fff" strokeWidth="2" /></g>}
          </g>
        );
      })}
    </svg>
  );
}

export const agentDescription = (id: string) => NODE_DESC[id] ?? AGENT_ROLE[id] ?? "";
export const agentTitle = (id: string) => NODES.find((n) => n.id === id)?.label ?? AGENT_LABEL[id] ?? id;

/** Illustrative walkthrough of a run: steps through statuses on a timer. */
export function useDemoRun() {
  const steps: Array<Record<string, NodeStatus>> = useMemo(() => {
    const s0: Record<string, NodeStatus> = {};
    const seq: Array<Record<string, NodeStatus>> = [s0];
    const add = (patch: Record<string, NodeStatus>) => seq.push({ ...seq[seq.length - 1], ...patch });
    add({ question: "completed", manager: "running" });
    add({ manager: "completed", github: "running", project: "running" });
    add({ github: "completed", project: "completed", bug: "running", devops: "running" });
    add({ bug: "completed", devops: "completed", review: "running" });
    add({ review: "completed", report: "running" });
    add({ report: "completed" });
    return seq;
  }, []);
  const [i, setI] = useState(-1);
  useEffect(() => {
    if (i < 0 || i >= steps.length - 1) return;
    const t = setTimeout(() => setI(i + 1), 1500);
    return () => clearTimeout(t);
  }, [i, steps.length]);
  const CAPTIONS = [
    "", "The Manager agent reads your question and decides which specialists are needed.",
    "The GitHub and Project agents fetch pull requests, commits, tasks and deadlines (read-only).",
    "The Bug and DevOps agents look at open bugs and automated build/test results.",
    "The Review agent checks every claim against the data actually fetched. Unproven claims are marked.",
    "The Manager writes the report: summary, findings with proof links, and recommended actions.",
    "Done. Every recommendation can be traced back to real evidence.",
  ];
  return { statuses: i < 0 ? {} : steps[i], running: i >= 0 && i < steps.length - 1, caption: i < 0 ? "" : CAPTIONS[i], start: () => setI(1), reset: () => setI(-1) };
}

/* ------------------------------------------------------------------ */
/* Generic animated flow (boxes connected by moving dots)              */
/* ------------------------------------------------------------------ */

export function FlowStrip({ steps }: { steps: Array<{ icon: string; title: string; text: string }> }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || reducedMotion()) return;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 2600);
    return () => clearInterval(t);
  }, [auto, steps.length]);
  return (
    <div>
      <div className="flowstrip">
        {steps.map((s, i) => (
          <div key={s.title} className="fs-item">
            <button className={`fs-box ${i === active ? "on" : ""} ${i < active ? "past" : ""}`} onClick={() => { setAuto(false); setActive(i); }}>
              <span className="fs-icon">{s.icon}</span><span>{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`fs-link ${i < active ? "lit" : ""} ${i === active ? "go" : ""}`}><i /></div>}
          </div>
        ))}
      </div>
      <div className="fs-detail" key={active}><strong>{steps[active].icon} {steps[active].title}.</strong> {steps[active].text}</div>
    </div>
  );
}
