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

## Deploy on Vercel (Manual)

Deploy directly from the Vercel dashboard:

1. Create a new Vercel project and import this repository.
2. Set project root directory to `web`.
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## Notes

- Main app source is under `web/src/`.
- App Router bridge files also exist under `web/app/` for route compatibility.
