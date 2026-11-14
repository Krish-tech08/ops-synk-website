import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * "Explain mode": plain-language callouts for people new to DevOps.
 * On by default so a first-time viewer sees the explanations; the choice is remembered per browser.
 */
const KEY = "opssynk.explain";
const Ctx = createContext<{ on: boolean; toggle: () => void }>({ on: true, toggle: () => {} });

export function ExplainProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* storage unavailable */ } }, [on]);
  return <Ctx.Provider value={{ on, toggle: () => setOn((v) => !v) }}>{children}</Ctx.Provider>;
}

export const useExplain = () => useContext(Ctx);

/** Beginner callout shown only while Explain mode is on. */
export function Explain({ title = "What am I looking at?", children }: { title?: string; children: ReactNode }) {
  const { on } = useExplain();
  if (!on) return null;
  return (
    <div className="explain" role="note">
      <span className="explain-icon" aria-hidden>💡</span>
      <div><div className="explain-title">{title}</div><div className="explain-body">{children}</div></div>
    </div>
  );
}

/** Small "?" bubble with a plain-language definition on hover or keyboard focus. */
export function InfoTip({ text }: { text: ReactNode }) {
  return (
    <span className="infotip" tabIndex={0} aria-label="Explanation">
      ?
      <span className="infotip-pop" role="tooltip">{text}</span>
    </span>
  );
}

/** Plain-language definitions reused across pages. */
export const DEFINE = {
  health: "A 0–100 score showing how smoothly engineering work is going. It is calculated by fixed rules from five areas: delivery, CI/CD, bugs, pull requests and activity.",
  stalePr: "A pull request is a proposed code change waiting for review. It becomes \"stale\" when nobody has touched it for 7+ days: work is stuck.",
  bugs: "Open issues labelled as bugs: known problems in the software that are not fixed yet.",
  ci: "CI (Continuous Integration) automatically builds and tests every code change. A failed run means the change broke the build or a test.",
  overdue: "Planned tasks whose due date has passed but are not done.",
  coverage: "How much of the needed data was actually available. Low coverage means the score is based on less information.",
  activeProjects: "Projects tracked in OpsSynk, each linked to one or more GitHub repositories.",
  passRate: "Share of automated build-and-test runs that succeeded. 80%+ is generally healthy.",
  commits: "A commit is one saved change to the code. More commits = more active development.",
  openPrs: "Code changes proposed by developers that have not been accepted (merged) yet.",
  issues: "Tickets in GitHub: bug reports, feature requests or to-dos.",
} as const;
