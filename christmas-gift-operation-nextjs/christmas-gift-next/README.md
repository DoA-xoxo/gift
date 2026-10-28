# 크리스마스 선물 만들기 대작전 — Next.js

Nutcracker-inspired Christmas event dashboard built with **Next.js App Router**, React, CSS, and Lucide icons. The current page is a client-side demo with interactive contribution, sabotage, team ranking tabs, and nickname rename behavior.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Upload this folder to a GitHub repository.
2. Import the repository at https://vercel.com/new.
3. Vercel detects Next.js automatically; use the default build command `next build` and output settings.
4. Deploy.

## Supabase real-time setup

The UI currently runs in demo mode with in-memory sample data. To run a shared, multi-user event, connect Supabase and move point balances, contributions, team progress and nickname updates into database-backed server-validated RPCs. Never let a browser directly set its own point balance or team progress. `.env.example` shows the public project variables; no real credentials are included in this package.

Suggested tables: `profiles`, `team_progress`, `contributions`, and `point_transactions`. Enable Realtime for `team_progress` and `contributions`; add Row Level Security and validate point spending inside SQL functions/transactions before launching publicly.

## Project structure

- `app/page.jsx` — interactive dashboard UI
- `app/layout.jsx` — Korean metadata and root layout
- `app/globals.css` — responsive theme styling
- `public/gift-box.png` — transparent gift-box artwork
- `preview-concept.png` — visual design reference
