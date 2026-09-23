-- BrewSpot notification repair migration
--
-- Run this once in Supabase SQL Editor. It is safe to rerun.
-- The existing notifications table is preserved; this repairs legacy
-- foreign keys that still point at public.users instead of public.profiles.

begin;

-- Keep the current notification payload model available on older databases.
alter table public.notifications add column if not exists action text;
alter table public.notifications add column if not exists text text default '';
alter table public.notifications add column if not exists target text;
alter table public.notifications add column if not exists system boolean not null default false;
alter table public.notifications add column if not exists read boolean not null default false;

-- All application users are represented by profiles, which are linked to
-- auth.users. Remove stale legacy users FKs before creating the correct ones.
alter table public.notifications drop constraint if exists notifications_user_id_fkey;
alter table public.notifications drop constraint if exists notifications_actor_id_fkey;

alter table public.notifications
  add constraint notifications_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;

alter table public.notifications
  add constraint notifications_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null not valid;

create index if not exists notifications_user_created_at_idx
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;

-- Verification after running:
-- select constraint_name, table_name
-- from information_schema.table_constraints
-- where table_schema = 'public' and table_name = 'notifications';
