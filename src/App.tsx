import { useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { ExplainProvider } from "./lib/explain";
import { q, setTokenProvider, type Project } from "./lib/api";
import { useApi } from "./lib/useApi";
import { Layout } from "./components/Layout";
import { NewInvestigation } from "./components/NewInvestigation";
import { Loading } from "./components/ui";
import { Overview } from "./pages/Overview";
import { ProjectDetail, ProjectsPage } from "./pages/Projects";
import { InvestigationDetail, InvestigationsPage } from "./pages/Investigations";
import { RepositoriesPage, RepositoryDetail } from "./pages/Repositories";
import { IncidentsPage } from "./pages/Incidents";
import { AgentsPage, LoginPage, SettingsPage } from "./pages/Static";
import { LearnPage } from "./pages/Learn";

function Shell() {
  const { user, ready, getToken } = useAuth();
  const loc = useLocation();
  const [dialog, setDialog] = useState<{ projectId?: string } | null>(null);
  setTokenProvider(getToken);   // set during render so child pages' first requests already carry the token
  const projects = useApi<Project[]>(user ? `/api/v1/projects${q({ limit: 100 })}` : null);
  if (!ready) return <Loading label="Starting…" />;
  if (!user) {
    // The DevOps guide needs no backend, so it is reachable before signing in.
    if (loc.pathname === "/learn") return <PublicLearn />;
    return <LoginPage />;
  }
  const open = (projectId?: string) => setDialog({ projectId });
  return (
    <Layout onNewInvestigation={() => open()}>
      <Routes>
        <Route path="/" element={<Overview onNewInvestigation={() => open()} />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetail onInvestigate={(id) => open(id)} />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/repositories/:repositoryId" element={<RepositoryDetail />} />
        <Route path="/investigations" element={<InvestigationsPage onNew={() => open()} />} />
        <Route path="/investigations/:investigationId" element={<InvestigationDetail />} />
        <Route path="/incidents" element={<IncidentsPage projects={projects.data ?? []} />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {dialog && <NewInvestigation projects={projects.data ?? []} presetProjectId={dialog.projectId} onClose={() => setDialog(null)} />}
    </Layout>
  );
}

function PublicLearn() {
  return (
    <div className="public-learn">
      <div className="topbar"><div className="brand"><span className="logo">✓</span> OpsSynk</div><Link className="btn primary" to="/">Sign in to the dashboard →</Link></div>
      <div className="content"><LearnPage /></div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><ExplainProvider><BrowserRouter><Shell /></BrowserRouter></ExplainProvider></AuthProvider>;
}
