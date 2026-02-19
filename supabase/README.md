# Supabase Backend Foundation

This folder contains the initial backend setup for Lume.

## Files

- `migrations/202602190001_lume_init.sql`: Core schema, triggers, indexes, and RLS policies.
- `migrations/202602190002_invitation_acceptance_rls.sql`: RLS updates for invite acceptance flow.
- `migrations/202602190003_notification_inbox_insert_policy.sql`: Insert policy for realtime inbox writes.
- `migrations/202602190004_notification_inbox_realtime_publication.sql`: Realtime publication setup for inbox updates.
- `seed/001_seed_demo.sql`: Seeds one workspace, one board, owner membership, and default lists.
- `tests/permission_checks.sql`: Permission verification checklist and test queries.

## Run order

1. Run migration:
   - `supabase/migrations/202602190001_lume_init.sql`
   - `supabase/migrations/202602190002_invitation_acceptance_rls.sql`
   - `supabase/migrations/202602190003_notification_inbox_insert_policy.sql`
   - `supabase/migrations/202602190004_notification_inbox_realtime_publication.sql`
2. Create at least one auth user.
3. Run seed:
   - `supabase/seed/001_seed_demo.sql`
4. Run or follow checks:
   - `supabase/tests/permission_checks.sql`

## Important

- The migration includes the composite unique key on `tasks (id, board_id)` to support
  the composite foreign key from `comments (task_id, board_id)`.
- Access control highlights from RLS:
  - `owner` can manage board structure and members.
  - `member` can edit board content.
  - `viewer` is read-only for board content.
  - Task deletion is allowed for board owner or task creator.
  - List deletion is restricted to board owner.
