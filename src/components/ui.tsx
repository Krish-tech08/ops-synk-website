import type { ReactNode } from "react";
import type { Category, HealthStatus, SubScore } from "../lib/api";
import { CATEGORY_LABEL, STATUS_COLOR, STATUS_LABEL, scoreColor } from "../lib/format";
import { InfoTip } from "../lib/explain";
import { CountUp, useMounted } from "./viz";

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && <header className="card-head"><h2>{title}</h2>{action}</header>}
      {children}
    </section>
  );
}

export const StatusBadge = ({ status }: { status: HealthStatus }) => (
  <span className="badge" style={{ color: STATUS_COLOR[status], background: `${STATUS_COLOR[status]}1A` }}>{STATUS_LABEL[status]}</span>
);

const SEV_COLOR = { critical: "#C2412D", high: "#D9682B", medium: "#C98A1B", low: "#6B665E" } as const;
export const SeverityBadge = ({ severity }: { severity: keyof typeof SEV_COLOR }) => (
  <span className="badge sev" style={{ color: "#fff", background: SEV_COLOR[severity] }}>{severity}</span>
);

export function KindBadge({ kind, verification }: { kind: string; verification?: string }) {
  if (verification === "unverified") return <span className="badge muted" title="Not confirmed by retrieved data; excluded from recommendations">Unverified</span>;
  if (kind === "hypothesis") return <span className="badge hyp" title="Plausible but not confirmed">Hypothesis</span>;
  if (kind === "inference") return <span className="badge inf" title="Derived from facts by documented rules">Rule-based inference</span>;
  return <span className="badge fact" title="Directly observed in GitHub or project data">Verified fact</span>;
}

export const DemoBadge = ({ show }: { show: boolean }) =>
  show ? <span className="badge demo" title="Data comes from the labelled demo dataset, not live GitHub">Demo data</span> : null;

export function Kpi({ label, value, hint, tone, info, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string; info?: ReactNode; icon?: string }) {
  return (
    <div className="kpi" style={tone ? { borderTopColor: tone } : undefined}>
      <div className="label">{icon && <span className="kpi-icon">{icon}</span>}{label}{info && <InfoTip text={info} />}</div>
      <div className="kpi-value" style={tone ? { color: tone } : undefined}><CountUp value={value} /></div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

/** Half-donut gauge for a 0–100 score. */
export function HealthGauge({ score, status, size = 190 }: { score: number | null; status: HealthStatus; size?: number }) {
  const r = 70, c = Math.PI * r;
  const v = score ?? 0;
  const color = STATUS_COLOR[status];
  const mounted = useMounted();
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 180 112" role="img" aria-label={`Health score ${score ?? "not available"}`}>
      <path d="M20 100 A70 70 0 0 1 160 100" fill="none" stroke="#EDE7DE" strokeWidth="16" strokeLinecap="round" />
      {score !== null && (
        <path d="M20 100 A70 70 0 0 1 160 100" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${mounted ? (v / 100) * c : 0} ${c}`} style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.2,.8,.2,1)" }} />
      )}
      <text x="90" y="88" textAnchor="middle" fontSize="34" fontWeight="700" fill="#1F1D1A">{score === null ? "—" : <CountUp value={Math.round(score)} />}</text>
      <text x="90" y="106" textAnchor="middle" fontSize="11" fill="#8A8F98">out of 100</text>
    </svg>
  );
}

/** Weighted category bars with the reason behind each score. */
export function CategoryBars({ subScores, weights }: { subScores: Array<Pick<SubScore, "category" | "score" | "reason">>; weights?: Partial<Record<Category, number>> }) {
  const mounted = useMounted();
  return (
    <div className="bars">
      {subScores.map((s) => (
        <div key={s.category} className="bar-row">
          <div className="bar-top">
            <span className="bar-name">{CATEGORY_LABEL[s.category]}{weights?.[s.category] !== undefined && <span className="chip">{Math.round(weights[s.category]! * 100)}% weight</span>}</span>
            <span className="bar-score" style={{ color: scoreColor(s.score) }}>{s.score === null ? "No data" : `${Math.round(s.score)}/100`}</span>
          </div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${mounted ? s.score ?? 0 : 0}%`, background: scoreColor(s.score) }} /></div>
          {s.reason && <div className="bar-reason">{s.reason}</div>}
        </div>
      ))}
    </div>
  );
}

export const Loading = ({ label = "Loading…" }: { label?: string }) => <div className="state"><span className="spinner" />{label}</div>;
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-box"><strong>Couldn’t load this.</strong> {message} {onRetry && <button className="btn small" onClick={onRetry}>Try again</button>}</div>;
}
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
