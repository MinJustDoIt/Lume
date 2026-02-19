# Lume Web App

TypeScript-first Next.js app for Lume collaborative task management.

## Current Features

- Authentication (register/login) with Supabase Auth
- Workspace and board browsing on `/app`
- Board Kanban view with:
  - list and task creation
  - drag and drop for lists and tasks
  - task detail modal with comments, replies, reactions, and activity
- Board people management (invite/update/remove)
- Notification inbox dropdown with realtime refresh and deep links
- Profile settings (name and password updates)
- Board content deletion:
  - delete board (owner)
  - delete list (owner)
  - delete task (owner or task creator)
- Role-based UI behavior:
  - `viewer` is read-only (no add/edit/delete controls)
- Theme support:
  - dark/light mode toggle in header
  - default theme is dark
  - theme preference persisted in `localStorage`

## Environment Variables

Create `web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Run

```bash
cd web
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Vercel CI/CD (GitHub Actions)

Workflow file: `.github/workflows/vercel-deploy.yml`

Add these repository secrets in GitHub (`Settings -> Secrets and variables -> Actions`):

- `VERCEL_TOKEN`
  - Create in Vercel: `Account Settings -> Tokens -> Create Token`
- `VERCEL_ORG_ID`
  - From Vercel project settings or from `.vercel/project.json` after linking locally
- `VERCEL_PROJECT_ID`
  - From Vercel project settings or from `.vercel/project.json` after linking locally

Optional local helper to get IDs:

```bash
cd web
npx vercel link
```

After linking, check `.vercel/project.json` for `orgId` and `projectId`.

## Notes

- Main app source is under `web/src/`.
- App Router bridge files also exist under `web/app/` for route compatibility.
