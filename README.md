# OpsSynk Web: Engineering Command Center

React + TypeScript + Vite dashboard for the OpsSynk backend. Charts use Recharts; sign-in uses Firebase Authentication.

| Page | What it shows |
|---|---|
| Overview | Company health gauge, weighted category bars, KPIs, project-score chart, status donut, latest AI recommendations, filterable project board, "Sync GitHub" |
| Projects | Project cards; add a project (repository picker limited to your GitHub organization) |
| Project detail | Gauge, radar of the five dimensions, why-this-score bars, stale PRs, bugs, CI failures and blockers (with links), editable tasks, "Run AI investigation" |
| Repositories | Live GitHub repositories, CI pass/fail chart, open PRs, deployment evidence (or "not assessed") |
| AI Investigations | Live six-agent pipeline and activity feed (SSE, polling fallback), executive summary, recommendations with clickable cited findings, findings with evidence links, data gaps, AI/data-call budgets |
| Incidents | Report an incident and send it to the AI with one click |
| How the agents work / Settings | Plain-language explanation of the agents and safeguards; live server status |

The UI only shows what the backend returns. Demo data is labelled **Demo data**, missing data says so, and nothing is invented.

## Run locally against the deployed backend

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

## Deploy on Render (Static Site)

1. Push this folder to GitHub. In Render: **New → Static Site** → select the repository.
2. **Build command:** `npm ci && npm run build`. **Publish directory:** `dist`.
3. **Environment:** add all the `VITE_*` variables above. They are baked in at build time, so redeploy after changing them.
4. **Redirects/Rewrites** (left sidebar): add a rule with **Source** `/*`, **Destination** `/index.html`, **Action** `Rewrite`.
   Without it, refreshing a page such as `/projects` returns 404.
5. Deploy. Your site gets a URL such as `https://opssynk-web.onrender.com`.

## Allow the site in the backend (required)

In the backend service on Render → **Environment** → add or change:

```
CORS_ORIGINS=https://opssynk-web.onrender.com,http://localhost:5173
```

Use the exact origin: no trailing slash and no path. Save; the backend redeploys.

## Notes

* The Firebase web `apiKey` is not a secret; it only identifies the project. Never put the backend's service-account JSON in this app.
* `VITE_AUTH_MODE=dev` is for local testing with a backend running `AUTH_MODE=dev`. The deployed backend refuses dev tokens.
* The free Render backend sleeps when idle; the dashboard shows "Waking up the server…" while the first request is slow.
