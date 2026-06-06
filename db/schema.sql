-- =====================================================================
--  KIDO — Supabase schema 
--  Paste this whole file into the Supabase SQL editor and hit Run.
--  Idempotent: safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "pg_trgm";      -- fuzzy search on names

-- ---------------------------------------------------------------------
-- 2) ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type role_enum as enum ('PARENT', 'BABY_SITTER', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status_enum as enum ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status_enum as enum ('PENDING', 'VERIFIED', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type_enum as enum (
    'NEW_BOOKING', 'BOOKING_CONFIRMED', 'BOOKING_DECLINED',
    'NEW_REVIEW', 'DOCUMENT_VERIFIED', 'SYSTEM'
  );
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- 3) PROFILES  (base for every user, 1-1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  first_name    text not null default '',
  last_name     text not null default '',
  email         text unique not null,
  phone         text,
  photo_url     text,
  role          role_enum not null default 'PARENT',
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- ---------------------------------------------------------------------
-- 4) PARENT_DETAILS  (extra fields for role = PARENT)
-- ---------------------------------------------------------------------
create table if not exists public.parent_details (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  address       text,
  nb_children   int not null default 0 check (nb_children >= 0)
);

-- ---------------------------------------------------------------------
-- 5) BABYSITTER_DETAILS  (extra fields for role = BABY_SITTER)
-- ---------------------------------------------------------------------
create table if not exists public.babysitter_details (
  profile_id         uuid primary key references public.profiles(id) on delete cascade,
  bio                text,
  experience         text not null default '1–2 years',  -- '1–2 years' | '3–5 years' | '5+ years'
  hourly_rate        int  not null check (hourly_rate > 0),     -- DZD
  neighborhood       text,
  city               text not null default 'Algiers',
  latitude           double precision,
  longitude          double precision,
  languages          text[] not null default '{}',
  specialties        text[] not null default '{}',
  response_minutes   int  not null default 30,
  is_validated       boolean not null default false,  -- admin-approved, visible in search
  identity_verified  boolean not null default false,
  police_check       boolean not null default false,
  is_available_now   boolean not null default false,
  average_rating     numeric(3,2) not null default 0,
  reviews_count      int not null default 0
);

create index if not exists idx_sitter_validated  on public.babysitter_details(is_validated) where is_validated;
create index if not exists idx_sitter_rating     on public.babysitter_details(average_rating desc);
create index if not exists idx_sitter_hourly     on public.babysitter_details(hourly_rate);

-- ---------------------------------------------------------------------
-- 6) ADMIN_DETAILS  (extra fields for role = ADMIN)
-- ---------------------------------------------------------------------
create table if not exists public.admin_details (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  access_level  int not null default 1
);

-- ---------------------------------------------------------------------
-- 7) IDENTITY_DOCUMENTS
-- ---------------------------------------------------------------------
create table if not exists public.identity_documents (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  document_type     text not null default 'NATIONAL_ID',     -- 'NATIONAL_ID' | 'PASSPORT'
  document_number   text,
  photo_front_url   text not null,
  photo_back_url    text,
  status            document_status_enum not null default 'PENDING',
  rejection_reason  text,
  uploaded_at       timestamptz not null default now(),
  verified_at       timestamptz,
  verified_by       uuid references public.profiles(id)
);

create index if not exists idx_docs_status on public.identity_documents(status);
create index if not exists idx_docs_profile on public.identity_documents(profile_id);

-- ---------------------------------------------------------------------
-- 8) AVAILABILITIES  (sitter's offered slots)
-- ---------------------------------------------------------------------
create table if not exists public.availabilities (
  id             uuid primary key default gen_random_uuid(),
  babysitter_id  uuid not null references public.profiles(id) on delete cascade,
  start_date     timestamptz not null,
  end_date       timestamptz not null,
  is_booked      boolean not null default false,
  created_at     timestamptz not null default now(),
  check (end_date > start_date)
);

create index if not exists idx_avail_sitter on public.availabilities(babysitter_id, start_date);

-- ---------------------------------------------------------------------
-- 9) BOOKINGS
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,  -- human-readable, e.g. '328-047'
  parent_id       uuid not null references public.profiles(id) on delete cascade,
  babysitter_id   uuid not null references public.profiles(id) on delete cascade,
  start_date      timestamptz not null,
  end_date        timestamptz not null,
  duration_hours  numeric(4,2) not null check (duration_hours > 0),
  hourly_rate     int not null check (hourly_rate > 0),       -- snapshot at booking time
  total_price     int not null check (total_price >= 0),
  status          booking_status_enum not null default 'PENDING',
  children_count  int not null default 1 check (children_count > 0),
  age_band        text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_date > start_date)
);

create index if not exists idx_bookings_parent on public.bookings(parent_id, start_date desc);
create index if not exists idx_bookings_sitter on public.bookings(babysitter_id, start_date desc);
create index if not exists idx_bookings_status on public.bookings(status);

-- ---------------------------------------------------------------------
-- 10) REVIEWS  (one per completed booking)
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid unique not null references public.bookings(id) on delete cascade,
  parent_id      uuid not null references public.profiles(id) on delete cascade,
  babysitter_id  uuid not null references public.profiles(id) on delete cascade,
  rating         int  not null check (rating between 1 and 5),
  comment        text,
  tags           text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists idx_reviews_sitter on public.reviews(babysitter_id, created_at desc);

-- ---------------------------------------------------------------------
-- 11) NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       notification_type_enum not null,
  title      text not null,
  message    text not null,
  data       jsonb,                -- payload (booking_id, etc.)
  is_read    boolean not null default false,
  sent_at    timestamptz not null default now()
);

create index if not exists idx_notifs_user   on public.notifications(user_id, sent_at desc);
create index if not exists idx_notifs_unread on public.notifications(user_id) where is_read = false;


-- =====================================================================
--  FUNCTIONS & TRIGGERS
-- =====================================================================

-- Keep `updated_at` honest.
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();


-- Auto-create profile + role details when a user signs up.
-- Reads raw_user_meta_data passed from signUp() options.data.
create or replace function public.handle_new_user() returns trigger as $$
declare
  chosen_role role_enum;
begin
  chosen_role := coalesce((new.raw_user_meta_data->>'role')::role_enum, 'PARENT');

  insert into public.profiles (id, email, first_name, last_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone),
    chosen_role
  );

  -- Create role-specific row
  if chosen_role = 'PARENT' then
    insert into public.parent_details (profile_id) values (new.id);
  elsif chosen_role = 'BABY_SITTER' then
    insert into public.babysitter_details (profile_id, hourly_rate) values (new.id, 200);
  elsif chosen_role = 'ADMIN' then
    insert into public.admin_details (profile_id) values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Recalculate sitter rating + reviews_count whenever a review is added/deleted.
create or replace function public.update_sitter_rating() returns trigger as $$
declare
  sid uuid := coalesce(new.babysitter_id, old.babysitter_id);
begin
  update public.babysitter_details
    set average_rating = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where babysitter_id = sid), 0),
        reviews_count  = (select count(*) from public.reviews where babysitter_id = sid)
    where profile_id = sid;

  -- Notify the sitter
  if TG_OP = 'INSERT' then
    insert into public.notifications (user_id, type, title, message, data)
    values (sid, 'NEW_REVIEW', 'New review',
            'A parent left you a ' || new.rating::text || '-star review.',
            jsonb_build_object('review_id', new.id));
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_review_change on public.reviews;
create trigger on_review_change
  after insert or delete on public.reviews
  for each row execute function public.update_sitter_rating();


-- When admin verifies an identity document, flip sitter.identity_verified & notify.
create or replace function public.sync_identity_verified() returns trigger as $$
begin
  if (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    if new.status = 'VERIFIED' then
      update public.babysitter_details
        set identity_verified = true
        where profile_id = new.profile_id;

      insert into public.notifications (user_id, type, title, message, data)
      values (new.profile_id, 'DOCUMENT_VERIFIED', 'Identity verified',
              'Your identity has been verified. You can now accept bookings.',
              jsonb_build_object('document_id', new.id));
    elsif new.status = 'REJECTED' then
      insert into public.notifications (user_id, type, title, message, data)
      values (new.profile_id, 'DOCUMENT_VERIFIED', 'Verification needs attention',
              coalesce(new.rejection_reason, 'Please re-upload your document.'),
              jsonb_build_object('document_id', new.id));
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_doc_status_change on public.identity_documents;
create trigger on_doc_status_change
  after update on public.identity_documents
  for each row execute function public.sync_identity_verified();


-- Before a booking is inserted, generate a friendly code + compute price if unset.
create or replace function public.prepare_booking() returns trigger as $$
begin
  if new.code is null or new.code = '' then
    new.code := lpad((1 + floor(random() * 899)::int)::text, 3, '0') || '-' ||
                lpad((1 + floor(random() * 899)::int)::text, 3, '0');
  end if;

  if new.total_price is null or new.total_price = 0 then
    new.total_price := (new.hourly_rate * new.duration_hours)::int;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists before_booking_insert on public.bookings;
create trigger before_booking_insert
  before insert on public.bookings
  for each row execute function public.prepare_booking();


-- Send notifications on booking lifecycle events.
create or replace function public.notify_booking_event() returns trigger as $$
declare
  pname text;
  sname text;
begin
  if TG_OP = 'INSERT' then
    select first_name || ' ' || last_name into pname from public.profiles where id = new.parent_id;
    insert into public.notifications (user_id, type, title, message, data)
    values (new.babysitter_id, 'NEW_BOOKING', 'New booking request',
            coalesce(pname, 'A parent') || ' sent you a booking request (#' || new.code || ').',
            jsonb_build_object('booking_id', new.id, 'code', new.code));

  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    select first_name || ' ' || last_name into sname from public.profiles where id = new.babysitter_id;

    if new.status = 'CONFIRMED' then
      insert into public.notifications (user_id, type, title, message, data)
      values (new.parent_id, 'BOOKING_CONFIRMED', 'Booking confirmed',
              coalesce(sname, 'Your sitter') || ' confirmed booking #' || new.code || '.',
              jsonb_build_object('booking_id', new.id));
    elsif new.status = 'DECLINED' then
      insert into public.notifications (user_id, type, title, message, data)
      values (new.parent_id, 'BOOKING_DECLINED', 'Booking declined',
              'Booking #' || new.code || ' was declined. Try another sitter.',
              jsonb_build_object('booking_id', new.id));
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_booking_event on public.bookings;
create trigger on_booking_event
  after insert or update on public.bookings
  for each row execute function public.notify_booking_event();


-- =====================================================================
--  ROW LEVEL SECURITY
-- =====================================================================

-- Helper: is the current user an admin?
create or replace function public.is_admin() returns boolean as $$
  select exists(select 1 from public.admin_details where profile_id = auth.uid());
$$ language sql stable security definer set search_path = public;

alter table public.profiles              enable row level security;
alter table public.parent_details        enable row level security;
alter table public.babysitter_details    enable row level security;
alter table public.admin_details         enable row level security;
alter table public.identity_documents    enable row level security;
alter table public.availabilities        enable row level security;
alter table public.bookings              enable row level security;
alter table public.reviews               enable row level security;
alter table public.notifications         enable row level security;

-- PROFILES --------------------------------------------------------------
drop policy if exists "profiles: self select"           on public.profiles;
drop policy if exists "profiles: public sitter select"  on public.profiles;
drop policy if exists "profiles: self update"           on public.profiles;
drop policy if exists "profiles: admin all"             on public.profiles;

create policy "profiles: self select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: public sitter select" on public.profiles
  for select using (
    role = 'BABY_SITTER'
    and exists (select 1 from public.babysitter_details bd where bd.profile_id = profiles.id and bd.is_validated)
  );

create policy "profiles: self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles: admin all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- PARENT_DETAILS --------------------------------------------------------
drop policy if exists "parents: self all"  on public.parent_details;
drop policy if exists "parents: admin read" on public.parent_details;

create policy "parents: self all" on public.parent_details
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "parents: admin read" on public.parent_details
  for select using (public.is_admin());

-- BABYSITTER_DETAILS ----------------------------------------------------
drop policy if exists "sitters: public validated select" on public.babysitter_details;
drop policy if exists "sitters: self select"             on public.babysitter_details;
drop policy if exists "sitters: self insert"             on public.babysitter_details;
drop policy if exists "sitters: self update"             on public.babysitter_details;
drop policy if exists "sitters: admin all"               on public.babysitter_details;

create policy "sitters: public validated select" on public.babysitter_details
  for select using (is_validated = true);

create policy "sitters: self select" on public.babysitter_details
  for select using (auth.uid() = profile_id);

create policy "sitters: self insert" on public.babysitter_details
  for insert with check (auth.uid() = profile_id);

create policy "sitters: self update" on public.babysitter_details
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "sitters: admin all" on public.babysitter_details
  for all using (public.is_admin()) with check (public.is_admin());

-- ADMIN_DETAILS ---------------------------------------------------------
drop policy if exists "admins: self select" on public.admin_details;
create policy "admins: self select" on public.admin_details
  for select using (auth.uid() = profile_id);

-- IDENTITY_DOCUMENTS ----------------------------------------------------
drop policy if exists "docs: self select"  on public.identity_documents;
drop policy if exists "docs: self insert"  on public.identity_documents;
drop policy if exists "docs: self update"  on public.identity_documents;
drop policy if exists "docs: admin all"    on public.identity_documents;

create policy "docs: self select" on public.identity_documents
  for select using (auth.uid() = profile_id);

create policy "docs: self insert" on public.identity_documents
  for insert with check (auth.uid() = profile_id);

create policy "docs: self update" on public.identity_documents
  for update using (auth.uid() = profile_id and status = 'PENDING');

create policy "docs: admin all" on public.identity_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- AVAILABILITIES --------------------------------------------------------
drop policy if exists "avail: public read validated" on public.availabilities;
drop policy if exists "avail: sitter self all"       on public.availabilities;

create policy "avail: public read validated" on public.availabilities
  for select using (
    exists (select 1 from public.babysitter_details bd
            where bd.profile_id = availabilities.babysitter_id and bd.is_validated)
  );

create policy "avail: sitter self all" on public.availabilities
  for all using (auth.uid() = babysitter_id) with check (auth.uid() = babysitter_id);

-- BOOKINGS --------------------------------------------------------------
drop policy if exists "bookings: parent read"      on public.bookings;
drop policy if exists "bookings: sitter read"      on public.bookings;
drop policy if exists "bookings: parent create"    on public.bookings;
drop policy if exists "bookings: parent update"    on public.bookings;
drop policy if exists "bookings: sitter update"    on public.bookings;
drop policy if exists "bookings: admin all"        on public.bookings;

create policy "bookings: parent read" on public.bookings
  for select using (auth.uid() = parent_id);

create policy "bookings: sitter read" on public.bookings
  for select using (auth.uid() = babysitter_id);

create policy "bookings: parent create" on public.bookings
  for insert with check (auth.uid() = parent_id);

-- Parent may only cancel their own booking (set status = CANCELLED).
create policy "bookings: parent update" on public.bookings
  for update using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

-- Sitter may only change status to CONFIRMED / DECLINED / COMPLETED on their own bookings.
create policy "bookings: sitter update" on public.bookings
  for update using (auth.uid() = babysitter_id) with check (auth.uid() = babysitter_id);

create policy "bookings: admin all" on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- REVIEWS ---------------------------------------------------------------
drop policy if exists "reviews: public read"         on public.reviews;
drop policy if exists "reviews: parent create"       on public.reviews;
drop policy if exists "reviews: parent delete own"   on public.reviews;

create policy "reviews: public read" on public.reviews
  for select using (true);

-- Only allow insert when the booking is COMPLETED and belongs to this parent.
create policy "reviews: parent create" on public.reviews
  for insert with check (
    auth.uid() = parent_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.parent_id = auth.uid()
        and b.status = 'COMPLETED'
    )
  );

create policy "reviews: parent delete own" on public.reviews
  for delete using (auth.uid() = parent_id);

-- NOTIFICATIONS ---------------------------------------------------------
drop policy if exists "notifs: self read"     on public.notifications;
drop policy if exists "notifs: self update"   on public.notifications;
drop policy if exists "notifs: admin read"    on public.notifications;

create policy "notifs: self read" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifs: self update" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifs: admin read" on public.notifications
  for select using (public.is_admin());


-- =====================================================================
--  STORAGE BUCKETS  (run in SQL editor — creates once, ignores if exist)
-- =====================================================================
-- Avatar (public), ID documents (private).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('identity-documents', 'identity-documents', false)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "avatar read public"   on storage.objects;
drop policy if exists "avatar write self"    on storage.objects;
drop policy if exists "id doc read self"     on storage.objects;
drop policy if exists "id doc write self"    on storage.objects;
drop policy if exists "id doc admin read"    on storage.objects;

create policy "avatar read public" on storage.objects
  for select using (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar under <uid>/...
create policy "avatar write self" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "id doc read self" on storage.objects
  for select using (
    bucket_id = 'identity-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "id doc write self" on storage.objects
  for insert with check (
    bucket_id = 'identity-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "id doc admin read" on storage.objects
  for select using (
    bucket_id = 'identity-documents' and public.is_admin()
  );

-- =====================================================================
--  DONE.
-- =====================================================================
