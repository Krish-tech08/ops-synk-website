import { config } from "../config";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

type TokenFn = (force?: boolean) => Promise<string | null>;
let tokenFn: TokenFn = async () => null;
export const setTokenProvider = (fn: TokenFn) => { tokenFn = fn; };

/** Listeners notified when a request is slow (Render free tier waking up). */
const slowListeners = new Set<(slow: boolean) => void>();
export const onSlowRequest = (fn: (slow: boolean) => void) => { slowListeners.add(fn); return () => slowListeners.delete(fn); };
let inflightSlow = 0;

export async function api<T>(path: string, init: RequestInit = {}, retried = false): Promise<{ data: T; meta?: any }> {
  const token = await tokenFn(retried);
  const timer = setTimeout(() => { inflightSlow++; slowListeners.forEach((l) => l(true)); }, 4000);
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
      signal: init.signal ?? AbortSignal.timeout(90_000),
    });
  } catch (e) {
    throw new ApiError("NETWORK", (e as Error)?.name === "TimeoutError"
      ? "The server took too long to respond. It may be waking up; try again in a moment."
      : "Can't reach the OpsSynk server. Check your connection or the API URL.", 0);
  } finally {
    clearTimeout(timer);
    if (inflightSlow > 0) { inflightSlow--; if (inflightSlow === 0) slowListeners.forEach((l) => l(false)); }
  }
  if (res.status === 401 && !retried) return api<T>(path, init, true);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    const err = body?.error ?? {};
    throw new ApiError(err.code ?? `HTTP_${res.status}`, err.message ?? `Request failed (${res.status}).`, res.status);
  }
  return { data: body.data as T, meta: body.meta };
}

export const org = () => config.organizationId;
export const q = (params: Record<string, string | number | undefined>) =>
  "?" + Object.entries({ organizationId: org(), ...params }).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");

/**
 * SSE over fetch (browser EventSource can't send the Authorization header).
 * Resumes with Last-Event-ID; resolves when the stream ends (terminal event) or rejects on failure.
 */
export async function streamEvents(investigationId: string, after: number, onEvent: (e: InvestigationEvent) => void, signal: AbortSignal) {
  const token = await tokenFn(false);
  const res = await fetch(`${config.apiBaseUrl}/api/v1/agents/investigations/${investigationId}/stream`, {
    headers: { Authorization: `Bearer ${token}`, "Last-Event-ID": String(after), Accept: "text/event-stream" }, signal,
  });
  if (!res.ok || !res.body) throw new ApiError("STREAM_FAILED", "Live updates unavailable.", res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = chunk.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
      if (data) { try { onEvent(JSON.parse(data)); } catch { /* ignore malformed chunk */ } }
    }
  }
}

/* ---------- types (mirror the backend responses) ---------- */
export type HealthStatus = "healthy" | "warning" | "critical" | "insufficient_data";
export type Category = "delivery" | "ci" | "bugs" | "pullRequests" | "activity";
export interface SubScore { category: Category; score: number | null; reason: string | null; inputs: Record<string, any> }
export interface ProjectHealth {
  projectId: string; projectName: string; repositoryIds: string[]; score: number | null; status: HealthStatus; coverage: number;
  missingSignals: Category[]; subScores: SubScore[];
  evidence: {
    stalePullRequests: Array<{ repositoryId: string; number: number; title: string; url: string; daysSinceUpdate: number }>;
    openBugs: Array<{ repositoryId: string; number: number; title: string; url: string; severity: string }>;
    recentFailedRuns: Array<{ repositoryId: string; id: number; name: string; url: string; conclusion: string; createdAt: string }>;
    overdueTasks: Array<{ taskId: string; title: string; dueDate: string; status: string }>;
    blockedTasks: Array<{ taskId: string; title: string }>;
  };
  repositoryErrors: Array<{ repositoryId: string; signal: string; code: string; message: string }>;
  isDemoData: boolean; dataSource: "github" | "fixture"; computedAt: string;
}
export interface CompanyHealth {
  score: number | null; status: HealthStatus; coverage: number; missingSignals: Category[];
  categoryScores: Partial<Record<Category, number | null>>; projectCounts: Record<HealthStatus, number>;
  projects: Array<{ projectId: string; projectName: string; score: number | null; status: HealthStatus }>;
  containsDemoData: boolean; dataSource: "github" | "fixture"; computedAt: string;
  weights: Record<Category, number>; bands: { healthy: number; warning: number };
}
export interface Project {
  id: string; organizationId: string; name: string; description: string; teamId: string | null; repositoryIds: string[];
  ownerUid: string | null; status: string; priority: string; startDate: string | null; dueDate: string | null; isDemoData?: boolean;
}
export interface Task { id: string; title: string; status: string; priority: string; assigneeUid: string | null; dueDate: string | null }
export interface Evidence { sourceType: string; sourceId: string; sourceUrl?: string; observedAt?: string; details: Record<string, any> }
export interface Finding {
  id: string; agentId: string; kind: "fact" | "inference" | "hypothesis"; title: string; description: string;
  severity: "low" | "medium" | "high" | "critical"; category: string; projectId: string | null; repositoryId: string | null;
  evidence: Evidence[]; limitations: string[]; verification?: "verified" | "unverified" | "hypothesis"; reviewNotes?: string[];
}
export interface Report {
  investigationId: string; query: string; status: "completed" | "partial"; generatedAt: string;
  executiveSummary: string; executiveSummarySource: "model" | "rules"; health: CompanyHealth | null;
  agentSummaries: Array<{ agentId: string; status: string; summary: string; summarySource: "model" | "rules" }>;
  findings: Finding[];
  recommendations: Array<{ id: string; title: string; rationale: string; priority: "now" | "soon" | "later"; findingIds: string[]; source: "model" | "rules" }>;
  unavailableData: string[]; warnings: string[];
  dataProvenance: { github: string; projectData: string; containsDemoData: boolean };
  budgets: { modelCallsUsed: number; modelCallLimit: number; toolCallsUsed: number; toolCallLimit: number };
}
export interface Investigation {
  id: string; query: string; status: "queued" | "running" | "completed" | "partial" | "failed"; createdAt: string;
  startedAt: string | null; completedAt: string | null; agentStatuses: Record<string, string>;
  plan: { agents: string[]; rationale: string; source: "model" | "rules" } | null;
  finalReport: Report | null; errorSummary: string | null; incidentId: string | null; hasReport?: boolean;
  scope: { projectIds: string[]; repositoryIds: string[] };
}
export interface InvestigationEvent {
  sequence: number; agentId: string | null; eventType: string; message: string; status: string; timestamp: string; metadata: Record<string, any>;
}
export interface Incident { id: string; projectId: string | null; title: string; description: string; severity: string; status: string; createdAt: string; investigationIds: string[] }
export interface Repo { id: string; fullName: string; url: string; description: string | null; defaultBranch: string; archived: boolean; pushedAt: string | null }
