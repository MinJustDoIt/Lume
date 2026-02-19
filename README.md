# Lume Task Management

Lume is a collaborative task management web app (Linear-inspired) built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- User authentication (register/login)
- Workspaces and boards
- Kanban lists and tasks
- Drag-and-drop lists and tasks
- Task detail modal with:
  - status, priority, due date
  - comments, threaded replies, emoji reactions
  - activity log
- Board collaboration roles:
  - `owner`, `member`, `viewer`
- Permission rules:
  - owner can manage board and delete any task
  - members can edit board content
  - viewers are read-only
- In-app realtime notifications with deep links
- Profile settings (name/password)
- Dark/Light theme toggle (default dark)

## Tech Stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Realtime, RLS)

## Project Structure

- `web/` - frontend app
- `supabase/` - migrations, seed, backend docs

## Quick Start

### Frontend

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Set in `web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Backend

Follow setup and migration order in:

- `supabase/README.md`

## Deploy

Deploy manually on Vercel:

1. Import repository in Vercel
2. Set project root directory to `web`
3. Add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Documentation

- Frontend details: `web/README.md`
- Backend details: `supabase/README.md`