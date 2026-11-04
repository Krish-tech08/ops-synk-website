import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { onSlowRequest } from "../lib/api";
import { config } from "../config";

const NAV = [
  { section: "Workspace", items: [["/", "Overview", "▦"], ["/projects", "Projects", "▢"], ["/repositories", "Repositories", "⑂"], ["/incidents", "Incidents", "⚠"]] },
  { section: "Intelligence", items: [["/investigations", "AI Investigations", "✦"], ["/agents", "How the agents work", "◎"]] },
  { section: "Account", items: [["/settings", "Settings & status", "⚙"]] },
] as const;

export function Layout({ children, onNewInvestigation }: { children: ReactNode; onNewInvestigation: () => void }) {
  const { user, signOut } = useAuth();
  const [slow, setSlow] = useState(false);
  const loc = useLocation();
  useEffect(() => { const off = onSlowRequest(setSlow); return () => { off(); }; }, []);
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="logo">✓</span> OpsSynk <span className="chip">ENGINEERING</span></div>
        <div className="org-pill">● {config.organizationId}</div>
        {NAV.map((g) => (
          <nav key={g.section}>
            <div className="nav-section">{g.section}</div>
            {g.items.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <span className="nav-icon">{icon}</span>{label}
              </NavLink>
            ))}
          </nav>
        ))}
        <div className="sidebar-foot">
          <div className="avatar">{(user?.email ?? "?").slice(0, 2).toUpperCase()}</div>
          <div className="who"><div>{user?.email}</div><button className="link" onClick={() => void signOut()}>Sign out</button></div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="crumb">OpsSynk › <strong>{titleFor(loc.pathname)}</strong></div>
          <button className="btn primary" onClick={onNewInvestigation}>+ New Investigation</button>
        </div>
        {slow && <div className="banner">Waking up the server… the free hosting tier sleeps when idle, so the first request can take up to a minute.</div>}
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

function titleFor(p: string) {
  if (p === "/") return "Engineering Overview";
  if (p.startsWith("/projects")) return "Projects";
  if (p.startsWith("/repositories")) return "Repositories";
  if (p.startsWith("/investigations")) return "AI Investigations";
  if (p.startsWith("/incidents")) return "Incidents";
  if (p.startsWith("/agents")) return "Agents";
  return "Settings";
}
