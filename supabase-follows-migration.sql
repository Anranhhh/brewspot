-- BrewSpot follows migration
-- Run this once in the Supabase SQL Editor. Safe to rerun.
-- Local JSON fallback storage is not durable on Vercel/serverless deployments.

begin;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint follows_pkey primary key (follower_id, following_id),
  constraint follows_check_not_self check (follower_id <> following_id)
);

alter table public.follows drop constraint if exists follows_follower_id_fkey;
alter table public.follows drop constraint if exists follows_following_id_fkey;

alter table public.follows
  add constraint follows_follower_id_fkey
  foreign key (follower_id) references public.profiles(id) on delete cascade not valid;

alter table public.follows
  add constraint follows_following_id_fkey
  foreign key (following_id) references public.profiles(id) on delete cascade not valid;

create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists follows_follower_id_idx on public.follows(follower_id);

alter table public.follows enable row level security;

drop policy if exists "Follows viewable by everyone" on public.follows;
create policy "Follows viewable by everyone"
  on public.follows for select using (true);

drop policy if exists "Users can manage own follows" on public.follows;
create policy "Users can manage own follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

commit;

-- Verify after running:
-- select * from public.follows limit 10;
