-- BrewSpot cafe ownership and post relationship migration.
-- Run after supabase-profile-migration.sql. This migration is intentionally
-- additive so existing saved-cafe and Google Place data remains readable.

alter table public.cafes add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.cafes add column if not exists source text not null default 'legacy';
alter table public.cafes add column if not exists google_rating numeric(2,1);
alter table public.cafes add column if not exists google_rating_count integer;
alter table public.cafes add column if not exists normalized_name text;
alter table public.cafes add column if not exists normalized_address text;
alter table public.posts add column if not exists cafe_id uuid references public.cafes(id) on delete set null;
alter table public.posts add column if not exists title text;

-- The original database used public.users for posts.user_id. Authenticated
-- application users now live in public.profiles, keyed by auth.users.id.
-- Keep legacy orphaned rows for reporting, but enforce the correct target for
-- all new posts. NOT VALID allows this repair to run without deleting old data.
alter table public.posts drop constraint if exists posts_user_id_fkey;
alter table public.posts
  add constraint posts_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade
  not valid;

select 'posts_without_profiles' as report, p.id, p.user_id
from public.posts p
left join public.profiles profile on profile.id = p.user_id
where profile.id is null;

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  image_url text not null,
  storage_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (post_id, sort_order)
);

-- Canonical internal-ID café saves. The older saved_cafes table stores a
-- google_place_id and remains supported only for legacy reads.
create table if not exists public.cafe_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, cafe_id)
);

-- Existing cafe_saves tables may have been created against legacy
-- public.users. Repoint ownership to Auth-backed public.profiles so current
-- users can save cafés.
alter table public.cafe_saves drop constraint if exists cafe_saves_user_id_fkey;
alter table public.cafe_saves add constraint cafe_saves_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;

select 'cafe_saves_without_profiles' as report, cs.user_id, count(*) as save_count
from public.cafe_saves cs
left join public.profiles pr on pr.id = cs.user_id
where pr.id is null
group by cs.user_id;

-- Your existing database uses post_saves. Create the canonical saved_posts
-- table expected by the API, then copy legacy rows when that table exists.
create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, post_id)
);

do $$
begin
  if to_regclass('public.post_saves') is not null then
    execute '
      insert into public.saved_posts (user_id, post_id)
      select ps.user_id, ps.post_id
      from public.post_saves ps
      join public.profiles pr on pr.id = ps.user_id
      join public.posts p on p.id = ps.post_id
      on conflict (user_id, post_id) do nothing
    ';
  end if;
end $$;

-- Align interaction ownership with Auth-backed profiles. NOT VALID preserves
-- legacy orphan rows while enforcing the correct target for new writes.
alter table public.post_likes drop constraint if exists post_likes_user_id_fkey;
alter table public.post_likes add constraint post_likes_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.saved_posts drop constraint if exists saved_posts_user_id_fkey;
alter table public.saved_posts add constraint saved_posts_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;

-- Comments must also use Auth-backed profiles. This repairs older comments
-- tables that still reference public.users without deleting legacy comments.
alter table public.comments drop constraint if exists comments_user_id_fkey;
alter table public.comments add constraint comments_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;

-- Community post images are public Supabase Storage objects. The first path
-- segment is the authenticated user's UUID, matching the frontend uploader.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

-- Preserve old values as Google metadata. The old rating/reviews columns are
-- retained for compatibility, but application code no longer treats them as
-- BrewSpot community ratings.
update public.cafes
set google_rating = coalesce(google_rating, rating),
    google_rating_count = coalesce(google_rating_count, reviews)
where google_rating is null or google_rating_count is null;

update public.cafes
set normalized_name = lower(regexp_replace(trim(name), '[^a-z0-9]+', ' ', 'g')),
    normalized_address = lower(regexp_replace(trim(coalesce(address, '')), '[^a-z0-9]+', ' ', 'g'))
where normalized_name is null or normalized_address is null;

-- Canonical backfill. No rows are deleted or merged automatically.
update public.posts p
set cafe_id = c.id
from public.cafes c
where p.cafe_id is null
  and p.google_place_id is not null
  and c.google_place_id = p.google_place_id;

create index if not exists posts_cafe_id_idx on public.posts(cafe_id);
create index if not exists post_media_post_id_idx on public.post_media(post_id, sort_order);

-- Give legacy posts a media row so the new viewer works for existing content.
insert into public.post_media (post_id, image_url, sort_order)
select p.id, p.image_url, 0
from public.posts p
where p.image_url is not null
  and p.image_url <> ''
  and not exists (select 1 from public.post_media m where m.post_id = p.id);
create index if not exists cafes_normalized_name_idx on public.cafes(normalized_name);
create index if not exists cafes_coordinates_idx on public.cafes(latitude, longitude);

-- Run the following two reports before resolving any legacy duplicate Place IDs.
select 'unmatched_posts' as report, p.id, p.google_place_id
from public.posts p
where p.google_place_id is not null and p.cafe_id is null;

select 'duplicate_google_place_ids' as report, google_place_id, count(*) as cafe_count,
       array_agg(id) as cafe_ids
from public.cafes
where google_place_id is not null
group by google_place_id
having count(*) > 1;

-- Enforce uniqueness for clean Google data. If legacy duplicates exist, keep
-- the migration usable and leave the report above for manual resolution.
do $$
begin
  if not exists (
    select 1 from public.cafes
    where google_place_id is not null
    group by google_place_id
    having count(*) > 1
  ) then
    create unique index if not exists cafes_google_place_id_unique
    on public.cafes(google_place_id)
    where google_place_id is not null;
  else
    raise notice 'cafes_google_place_id_unique was not created because duplicate legacy Place IDs were reported above.';
  end if;
end $$;

create or replace view public.cafe_community_stats as
select c.id as cafe_id,
       count(p.id)::integer as post_count,
       count(p.rating)::integer as rating_count,
       round(avg(p.rating) filter (where p.rating is not null), 1) as community_rating,
       max(p.created_at) as latest_post_at,
       first_post.id as first_post_id,
       coalesce(first_media.image_url, first_post.image_url) as cover_image_url
from public.cafes c
left join public.posts p on p.cafe_id = c.id
left join lateral (
  select p0.id, p0.image_url
  from public.posts p0
  where p0.cafe_id = c.id
  order by p0.created_at asc, p0.id asc
  limit 1
) first_post on true
left join lateral (
  select pm.image_url
  from public.post_media pm
  where pm.post_id = first_post.id
  order by pm.sort_order asc, pm.id asc
  limit 1
) first_media on true
group by c.id, first_post.id, first_post.image_url, first_media.image_url;

create or replace view public.cafe_trending as
select s.cafe_id,
       coalesce(recent.recent_post_count, 0)::integer as recent_post_count,
       s.post_count,
       s.latest_post_at,
       s.rating_count,
       s.community_rating,
       s.first_post_id,
       coalesce(s.cover_image_url, c.hero_image) as cover_image_url
from public.cafe_community_stats s
join public.cafes c on c.id = s.cafe_id
left join lateral (
  select count(*) as recent_post_count
  from public.posts p
  where p.cafe_id = s.cafe_id
    and p.created_at >= now() - interval '30 days'
) recent on true;

alter table public.cafes enable row level security;
alter table public.post_media enable row level security;
alter table public.cafe_saves enable row level security;
drop policy if exists "Authenticated users can create cafes" on public.cafes;
create policy "Authenticated users can create cafes" on public.cafes
for insert to authenticated with check (created_by = auth.uid() and source = 'google_places');
drop policy if exists "Owners can update cafes" on public.cafes;
create policy "Owners can update cafes" on public.cafes
for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

grant select on public.cafe_community_stats to anon, authenticated;
grant select on public.cafe_trending to anon, authenticated;

drop policy if exists "Anyone can view post media" on public.post_media;
create policy "Anyone can view post media" on public.post_media
for select to anon, authenticated using (true);
drop policy if exists "Users can add media to their posts" on public.post_media;
create policy "Users can add media to their posts" on public.post_media
for insert to authenticated with check (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);
drop policy if exists "Users can delete media from their posts" on public.post_media;
create policy "Users can delete media from their posts" on public.post_media
for delete to authenticated using (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);

drop policy if exists "Users can view own cafe saves" on public.cafe_saves;
create policy "Users can view own cafe saves" on public.cafe_saves
for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can manage own cafe saves" on public.cafe_saves;
create policy "Users can manage own cafe saves" on public.cafe_saves
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Anyone can view post likes" on public.post_likes;
create policy "Anyone can view post likes" on public.post_likes
for select to anon, authenticated using (true);
drop policy if exists "Users can manage own post likes" on public.post_likes;
create policy "Users can manage own post likes" on public.post_likes
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Anyone can view saved posts" on public.saved_posts;
create policy "Anyone can view saved posts" on public.saved_posts
for select to anon, authenticated using (true);
drop policy if exists "Users can manage own saved posts" on public.saved_posts;
create policy "Users can manage own saved posts" on public.saved_posts
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Anyone can view post images" on storage.objects;
create policy "Anyone can view post images" on storage.objects
for select to anon, authenticated using (bucket_id = 'post-images');
drop policy if exists "Users can upload post images" on storage.objects;
create policy "Users can upload post images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Users can delete their post images" on storage.objects;
create policy "Users can delete their post images" on storage.objects
for delete to authenticated using (
  bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text
);
