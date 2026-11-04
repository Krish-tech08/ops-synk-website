import type { Category, HealthStatus } from "./api";
export const CATEGORY_LABEL: Record<Category, string> = {
  delivery: "Project delivery", ci: "CI/CD pipelines", bugs: "Bugs & defects", pullRequests: "Pull requests", activity: "Repository activity",
};
export const STATUS_LABEL: Record<HealthStatus, string> = { healthy: "Healthy", warning: "Warning", critical: "Critical", insufficient_data: "Not enough data" };
export const STATUS_COLOR: Record<HealthStatus, string> = { healthy: "#3F7D58", warning: "#C98A1B", critical: "#C2412D", insufficient_data: "#8A8F98" };
export const scoreColor = (s: number | null, bands = { healthy: 80, warning: 50 }) =>
  s === null ? STATUS_COLOR.insufficient_data : s >= bands.healthy ? STATUS_COLOR.healthy : s >= bands.warning ? STATUS_COLOR.warning : STATUS_COLOR.critical;
export const AGENT_LABEL: Record<string, string> = {
  manager: "Manager", github: "GitHub", project: "Project", bug: "Bug", devops: "DevOps", review: "Review / QA",
};
export const AGENT_ROLE: Record<string, string> = {
  manager: "Plans the investigation and writes the final report",
  github: "Pull requests and repository activity",
  project: "Tasks, deadlines, ownership and health scores",
  bug: "Open bugs, severity and similar reports",
  devops: "CI workflow results and deployment records",
  review: "Checks every finding against retrieved evidence",
};
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const pct = (n: number) => `${Math.round(n * 100)}%`;
