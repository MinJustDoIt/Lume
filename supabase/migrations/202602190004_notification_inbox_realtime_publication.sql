do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notification_events'
    ) then
      execute 'alter publication supabase_realtime add table public.notification_events';
    end if;
  end if;
end
$$;

alter table public.notification_events replica identity full;
