# OpsSynk: AI-Powered Engineering Command Center

**Live website:** **https://ops-synk-website.onrender.com/**
**Visual guide (no login needed):** https://ops-synk-website.onrender.com/learn

> OpsSynk tells a manager, in plain language and with proof, **how healthy their software projects are, where work is stuck, and what to do next**. It gets these answers by reading real GitHub and project data and sending a team of specialised AI agents to investigate.

---

## Table of contents

1. [The problem: why OpsSynk was made](#1-the-problem-why-opssynk-was-made)
2. [The motto and core principles](#2-the-motto-and-core-principles)
3. [What OpsSynk does](#3-what-opssynk-does)
4. [Who it helps and how](#4-who-it-helps-and-how)
5. [DevOps basics needed to follow this project](#5-devops-basics-needed-to-follow-this-project)
6. [How the health score works](#6-how-the-health-score-works)
7. [What AI agents are, and the six OpsSynk agents](#7-what-ai-agents-are-and-the-six-opssynk-agents)
8. [Safety and trust: how hallucination is prevented](#8-safety-and-trust-how-hallucination-is-prevented)
9. [System architecture](#9-system-architecture)
10. [Tour of the website, page by page](#10-tour-of-the-website-page-by-page)
11. [Technology stack](#11-technology-stack)
12. [Project structure](#12-project-structure)
13. [Running locally and deploying](#13-running-locally-and-deploying)
14. [Suggested walkthrough for an examiner](#14-suggested-walkthrough-for-an-examiner)
15. [Limitations and future work](#15-limitations-and-future-work)

---

## 1. The problem: why OpsSynk was made

Modern software teams spread their work across many tools:

- **GitHub** holds the code, the **pull requests** (proposed changes waiting for review), the **issues/bugs** and the **CI/CD runs** (automatic build-and-test results).
- **Project trackers** hold tasks, owners and deadlines.
- **Incidents** (production outages) are reported somewhere else again.

An engineering manager, team lead or non-technical stakeholder who asks a simple question, such as *"Which projects are at risk, and why?"* or *"What should the team fix first today?"*, has to:

1. open dozens of repositories and dashboards by hand,
2. understand technical terms like "failed workflow run" or "stale PR",
3. join the dots between code, bugs, builds and deadlines on their own.

This is slow and error-prone, and it needs technical knowledge many decision-makers don't have. Generic AI chatbots don't fix this: they have no access to the team's real data, and when they don't know an answer they tend to make one up ("hallucinate").

**OpsSynk was built to close this gap.** It brings all the engineering signals into one place, turns them into a single understandable health score, and lets anyone ask questions in plain English. A team of AI agents answers, and **every claim links to real evidence**.

## 2. The motto and core principles

> ### *"Clear answers about engineering health, backed by evidence, understandable by anyone."*

Every design decision follows from five principles:

| Principle | What it means in practice |
|---|---|
| **Evidence over opinion** | Every AI finding must cite the exact pull request, issue, CI run or task it is based on, with a clickable link. Claims without evidence are marked *unverified* and can never become recommendations. |
| **Numbers from code, words from AI** | Health scores, counts and pass rates are calculated by fixed, documented rules, not by the AI. The AI only plans, summarises and drafts recommendations. Scores are therefore **repeatable and auditable**. |
| **Honesty about gaps** | When data is missing, the dashboard says so ("not assessed", "Data the agents could not check"). Demo data is always labelled **Demo data**. Nothing is invented. |
| **Accessible to non-engineers** | An *Explain mode*, "?" tooltips on every metric, and an interactive *DevOps in 5 minutes* guide let a manager with no technical background understand every number. |
| **Safe by design** | GitHub access is **read-only**. Each investigation has caps on AI calls, data calls and time. AI keys never leave the server. |

## 3. What OpsSynk does

In one sentence: **it watches the software delivery cycle and reports in plain language where it is getting stuck.**

1. **Collects** data (read-only) from GitHub (pull requests, CI runs, issues, commits, deployments) and from project data (tasks, deadlines, owners).
2. **Scores** each project and the whole company from 0 to 100 using fixed rules across five areas: delivery, CI/CD, bugs, pull requests and activity. The score is shown as **green (healthy)**, **amber (warning)** or **red (critical)**.
3. **Investigates** on demand: the user asks a question and six AI agents analyse the data together.
4. **Reports** an executive summary, findings with evidence links, a prioritised to-do list (*now / soon / later*), and a list of what could not be checked.
5. **Teaches**: a built-in visual guide explains DevOps itself, so users understand what they are looking at.

Example questions users can ask (built into the app as presets):

- *What is the current engineering health of the company?*
- *Which projects are at risk, and why?*
- *Which repositories have stale pull requests?*
- *What is causing repeated CI/CD failures?*
- *Which bugs are blocking progress?*
- *What should the engineering team prioritize today?*

## 4. Who it helps and how

| User | Without OpsSynk | With OpsSynk |
|---|---|---|
| **Engineering manager** | Opens many repos and dashboards to guess which project is in trouble | One health gauge per project; red projects stand out immediately, with the reason |
| **Team lead** | Stale PRs and repeated build failures go unnoticed for weeks | Stale PRs (7+ days without activity), failed CI runs and blocked tasks are listed with direct links |
| **Non-technical stakeholder / executive** | Can't interpret DevOps jargon | Plain-language summaries, Explain mode, glossary and the visual guide |
| **On-call / incident responder** | Has to dig manually for the cause of an outage | Reports the incident and hands it to the AI agents with one click |
| **Auditor / reviewer** | Can't verify AI conclusions | Every finding is tied to evidence, and scores come from documented rules |

**Benefits:** problems are found earlier, less time goes into manual status-gathering, priorities are clearer, decisions rest on data rather than gut feeling, and engineers and management share the same vocabulary.

## 5. DevOps basics needed to follow this project

*(The website's [Learn page](https://ops-synk-website.onrender.com/learn) teaches all of this interactively.)*

**DevOps** (Development + Operations) is the practice of building, testing and releasing software quickly and reliably through automation. The work runs as a continuous loop:

```
   ┌──────────── DEV ────────────┐     ┌──────────── OPS ─────────────┐
   Plan → Code → Build → Test  →→→→→  Release → Deploy → Operate → Monitor
     ↑                                                                │
     └─────────────── feedback (bugs, incidents) ─────────────────────┘
```

| Term | Meaning |
|---|---|
| **Repository (repo)** | A project's code folder on GitHub, with its full history |
| **Commit** | One saved change to the code |
| **Pull request (PR)** | A request to merge a code change into the main code, reviewed by teammates first |
| **Stale PR** | A PR with no activity for 7+ days, meaning the work is stuck |
| **CI (Continuous Integration)** | Every change is automatically built and tested |
| **CD (Continuous Delivery/Deployment)** | Changes that pass CI are automatically released |
| **CI run / workflow run** | One execution of the automatic build-and-test pipeline; it passes or fails |
| **Bug / issue** | A recorded problem in the software |
| **Incident** | Something broken in production that is affecting users right now |

**Where OpsSynk looks at each stage:** Plan → *Project agent* (overdue/blocked tasks) · Code → *GitHub agent* (stale PRs) · Build/Test → *DevOps agent* (CI failures) · Deploy → *DevOps agent* (deployment records) · Operate → *Incidents page* · Monitor → *Bug agent* (open bugs by severity).

## 6. How the health score works

The health score is calculated by **deterministic code, not AI**, so the same data always gives the same score.

1. Each project is scored **0–100** in five areas:

   | Area | What lowers the score |
   |---|---|
   | **Project delivery** | Overdue, blocked or unassigned tasks |
   | **CI/CD pipelines** | Failed build/test runs (low CI pass rate) |
   | **Bugs & defects** | Open bugs, weighted heavily by severity (critical bugs count most) |
   | **Pull requests** | Stale pull requests waiting for review |
   | **Repository activity** | Little or no recent development activity |

2. The five area scores are **multiplied by their weights and added up** to give one project score. The project scores combine into a **company-wide score**.
3. The score is placed in a band: **Healthy** (green), **Warning** (amber), **Critical** (red), or **Not enough data** (grey).
4. **Coverage** shows how much of the needed data was actually available. If a signal is missing, it is left out of the weighting (and reported as missing) instead of being counted as zero.

The Overview page shows this breakdown visually ("How the score is calculated"): each area's score × its weight = the points it contributes, so anyone can check the arithmetic.

## 7. What AI agents are, and the six OpsSynk agents

### What is an AI agent?

An **AI agent** is an AI program that has **one narrow job** and a **limited set of tools** it is allowed to use (in OpsSynk, read-only data tools). Instead of one general AI trying to know everything (and guessing when it doesn't), OpsSynk uses a **team of specialists**, much like a hospital, where a general doctor refers the patient to specialists and a second-opinion doctor checks the diagnosis.

This **multi-agent** design has three advantages:

- **Focus:** each agent only looks at its own area, so its analysis is more accurate.
- **Parallelism:** specialists work at the same time, so answers arrive faster.
- **Checks and balances:** a separate reviewer verifies everyone else's work before the user sees it.

### The six agents

| # | Agent | Responsibility |
|---|---|---|
| 1 | 🧭 **Manager** | Reads the user's question, **plans** which specialists are needed, and at the end **writes the final report** |
| 2 | ⑂ **GitHub** | Pull requests and repository activity (e.g. stale PRs, merge activity) |
| 3 | 📋 **Project** | Tasks, deadlines, ownership and health scores (overdue, blocked or unassigned work) |
| 4 | 🐞 **Bug** | Open bugs, their severity, and similar-looking reports |
| 5 | ⚙ **DevOps** | CI workflow results and deployment records |
| 6 | 🔍 **Review / QA** | The fact-checker: **checks every finding against the evidence actually retrieved** |

### How an investigation flows

```
                         ┌──► GitHub agent  ──┐
                         ├──► Project agent ──┤
 Your question ──► Manager                    ├──► Review / QA ──► Final report
 (plain English)  (plans) ├──► Bug agent    ──┤    (fact-check)    (summary, evidence,
                         └──► DevOps agent ──┘                      prioritised actions)
```

1. **Ask:** the user types a question, optionally scoped to one project.
2. **Plan:** the Manager decides which specialists to involve and why.
3. **Investigate:** the specialists run in parallel. They fetch data with read-only tools and produce **findings**, each typed as a *fact*, *inference* or *hypothesis*, with a severity and attached **evidence**.
4. **Verify:** the Review/QA agent compares each finding's cited evidence with what was really retrieved. Findings are marked **verified**, **unverified** or **hypothesis**.
5. **Report:** the Manager writes an executive summary and recommendations (*now / soon / later*). Each recommendation links to the verified findings behind it.

On the website the user **watches this live**: the agent diagram lights up as each agent starts and finishes, and an activity feed streams every step (Server-Sent Events, with a polling fallback).

## 8. Safety and trust: how hallucination is prevented

Hallucination (AI inventing facts) is the main risk with AI tools. OpsSynk tackles it in layers:

| Safeguard | How it works |
|---|---|
| **Numbers come from code** | Scores, counts, staleness and CI rates are computed by fixed rules. The AI cannot change them. |
| **Mandatory evidence** | Each finding must cite a real source (PR number, issue, workflow run, task) with a link. |
| **Independent verification** | The Review/QA agent checks citations against the retrieved data; mismatches become *unverified* and **cannot become recommendations**. |
| **Hypotheses are labelled** | "These bugs may be related" stays a *hypothesis* and is never presented as a confirmed cause. |
| **Explicit data gaps** | Anything the agents could not check is listed in the report under "Data the agents could not check". |
| **Rules-only fallback** | If the AI model is unavailable, OpsSynk still produces a rules-based report and labels each part with its source (*model* or *rules*). |
| **Budgets** | Each investigation has limits on AI calls, data calls and time, and the report shows how much of each budget was used. |
| **Read-only access** | OpsSynk never writes to GitHub. |
| **Secure sign-in** | Firebase Authentication. Every API request carries a verified token, and the AI keys stay on the server. |

## 9. System architecture

```
┌──────────────────────────┐   HTTPS + Firebase ID token   ┌───────────────────────────────┐
│  OpsSynk Web (this repo) │ ─────────────────────────────► │  OpsSynk Backend (REST API)   │
│  React + TypeScript      │ ◄───────────────────────────── │  Health scoring rules         │
│  Recharts visualisations │   JSON  +  live SSE stream     │  Six-agent pipeline           │
│  Firebase sign-in        │                                │  Budgets & verification       │
└──────────────────────────┘                                └──────┬───────────┬────────────┘
        ▲                                                          │           │           │
        │ sign in                                     read-only    ▼           ▼           ▼
┌───────┴──────────┐                                   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Firebase Auth    │                                   │  GitHub API  │ │ Firestore│ │ Gemini (LLM) │
└──────────────────┘                                   └──────────────┘ └──────────┘ └──────────────┘
```

- **This repository is the frontend** (the website). It only displays what the backend returns.
- The **backend** (a separate service, also on Render) holds the scoring rules, the agents and the database access, and it calls the AI model (Google **Gemini**).
- **Firestore** stores organisations, projects, tasks, incidents and investigation results.
- **Firebase Authentication** handles user sign-in.

## 10. Tour of the website, page by page

| Page | What it shows |
|---|---|
| **Login** | Email/password sign-in, plus a link to the public DevOps guide |
| **Learn: "DevOps in 5 minutes"** *(public)* | Interactive guide: animated DevOps loop, CI/CD pipeline simulator (push a change, inject a bug, watch it get caught), pull-request lifecycle with a "stale PR" slider, a demo run of the agents, and a searchable glossary |
| **Overview** | Company health gauge, weighted score breakdown, KPIs, project-score chart, status donut, latest AI recommendations, a filterable project board, and "Sync GitHub" |
| **Projects** | Project cards. A project can be added and linked to GitHub repositories (picker limited to your GitHub organisation) |
| **Project detail** | Health gauge, radar chart of the five areas, "why this score" bars, stale PRs, bugs, CI failures and blockers (all linked), editable tasks, and a **Run AI investigation** button |
| **Repositories** | Live GitHub repositories, CI pass/fail chart, open PRs, and deployment evidence (or "not assessed") |
| **AI Investigations** | Live six-agent diagram and activity feed, executive summary, recommendations with clickable cited findings, findings with evidence links, data gaps, and AI/data budgets used |
| **Incidents** | Report a production incident and send it to the AI agents with one click |
| **How the agents work** | Plain-language explanation of every agent and safeguard, with an animation |
| **Settings** | Live server status (database, GitHub data source, AI model) and account details |

**Explain mode** (on by default, toggled in the header) adds "What am I looking at?" callouts to every page, and **"?" tooltips** define each metric in plain language.

## 11. Technology stack

| Layer | Technology | Why |
|---|---|---|
| UI framework | **React 18** + **TypeScript** | Component-based UI; type safety mirrors the backend's API types |
| Build tool | **Vite** | Fast development server and optimised production builds |
| Routing | **React Router 6** | Multi-page single-page app |
| Charts | **Recharts** + custom SVG | Gauges, radar, bars, donut, the animated agent graph and the DevOps loop |
| Authentication | **Firebase Authentication** | Secure sign-in; ID tokens are sent to the backend |
| Live updates | **Server-Sent Events** (via `fetch`), polling fallback | Streams agent progress in real time |
| Hosting | **Render** (Static Site) | Free hosting with SPA rewrites |
| Backend *(separate repo)* | REST API, **Firestore**, **GitHub API**, **Google Gemini** | Scoring, agents and data |

## 12. Project structure

```
src/
├── main.tsx, App.tsx          # entry point, routes, sign-in guard
├── config.ts                  # reads VITE_* environment variables
├── lib/
│   ├── api.ts                 # API client, token handling, SSE stream, shared types
│   ├── auth.tsx               # Firebase sign-in
│   ├── explain.tsx            # Explain mode, tooltips, plain-language definitions
│   ├── format.ts              # labels, colours, agent names and roles
│   └── useApi.ts              # data-fetching hook
├── components/
│   ├── Layout.tsx             # sidebar, header, Explain toggle
│   ├── NewInvestigation.tsx   # "ask a question" dialog with presets
│   ├── viz.tsx                # gauges, score breakdown, agent graph, flow strip
│   └── ui.tsx                 # cards, loading and error states
└── pages/
    ├── Overview.tsx  Projects.tsx  Repositories.tsx
    ├── Investigations.tsx  Incidents.tsx
    ├── Learn.tsx              # interactive DevOps guide
    └── Static.tsx             # agents explainer, settings, login
```

## 13. Running locally and deploying

### Run locally against the deployed backend

```powershell
npm install
copy .env.example .env.local      # then fill in the Firebase values
npm run dev                       # http://localhost:5173
```

Add `http://localhost:5173` to the backend's `CORS_ORIGINS` (see below), otherwise the browser blocks the requests.

`.env.local`:

```
VITE_API_BASE_URL=https://opssynk-backend2-0.onrender.com
VITE_ORGANIZATION_ID=org_demo
VITE_AUTH_MODE=firebase
VITE_FIREBASE_API_KEY=...            # from your Firebase web app config
VITE_FIREBASE_AUTH_DOMAIN=devops-6f096.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=devops-6f096
VITE_FIREBASE_APP_ID=...
```

Sign in with the email/password user you created in Firebase Authentication. It must be the UID you seeded as owner, or another member of `org_demo`.

Other scripts: `npm run build` (type-check and production build), `npm run typecheck`, `npm run preview`.

### Deploy on Render (Static Site)

1. Push this folder to GitHub. In Render: **New → Static Site** → select the repository.
2. **Build command:** `npm ci && npm run build`. **Publish directory:** `dist`.
3. **Environment:** add all the `VITE_*` variables above. They are baked in at build time, so redeploy after changing them.
4. **Redirects/Rewrites** (left sidebar): add a rule with **Source** `/*`, **Destination** `/index.html`, **Action** `Rewrite`. Without it, refreshing a page such as `/projects` returns 404.
5. Deploy.

### Allow the site in the backend (required)

In the backend service on Render → **Environment** → add or change:

```
CORS_ORIGINS=https://ops-synk-website.onrender.com,http://localhost:5173
```

Use the exact origin: no trailing slash and no path. Save; the backend redeploys.

### Notes

* The Firebase web `apiKey` is not a secret; it only identifies the project. Never put the backend's service-account JSON in this app.
* `VITE_AUTH_MODE=dev` is for local testing with a backend running `AUTH_MODE=dev`. The deployed backend refuses dev tokens.
* The free Render backend sleeps when idle. The first request can take up to a minute, and the dashboard shows "Waking up the server…" meanwhile.

## 14. Suggested walkthrough for an examiner

1. Open **https://ops-synk-website.onrender.com/learn** (no login needed). Play the DevOps loop, run the CI/CD simulator with and without a bug, and press **Watch a demo run** to see the six agents.
2. Sign in with the credentials provided by the project author. *(If the first load is slow, the free server is waking up.)*
3. **Overview:** check the company health score and expand **How the score is calculated** to see the weighted arithmetic.
4. Open a **project**: see the radar chart, the reasons behind its score, and the linked stale PRs, bugs and CI failures.
5. Click **New investigation**, pick *"Which projects are at risk, and why?"*, and watch the agents work live.
6. In the finished report, click a recommendation's cited findings and follow the evidence links to GitHub. Also check the "Data the agents could not check" and budget sections.
7. Visit **How the agents work** and **Settings** for the safeguards and live server status.

## 15. Limitations and future work

**Current limitations**

- Data sources are GitHub and OpsSynk's own project/task data. Jira, Slack, PagerDuty and cloud monitoring are not connected yet.
- Deployment health depends on GitHub deployment records; without them it is shown as *not assessed*.
- Free-tier hosting means a cold start after idle periods.
- AI summaries depend on the Gemini model; when it is unavailable, rules-based summaries are used instead.

**Possible future work**

- More integrations (Jira, GitLab, Slack alerts, cloud monitoring)
- Health-score trends over time and forecasting of deadline risk
- Scheduled investigations with email/Slack digests
- Role-based views for executives, managers and engineers

---

*OpsSynk: built so that anyone, technical or not, can understand the health of their engineering work and trust the answer.*
