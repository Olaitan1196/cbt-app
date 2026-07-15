-- ============================================================
-- PassOnce CBT — SUPABASE DATABASE SCHEMA
-- ============================================================
-- WHAT THIS FILE DOES:
-- Creates every table the new server-based version of PassOnce CBT
-- needs: user profiles, devices, payment licenses, questions,
-- institutions, and the full Genius Competition + Leaderboard system.
--
-- HOW TO USE THIS FILE:
-- 1. Open your Supabase project
-- 2. Click "SQL Editor" on the left sidebar
-- 3. Paste this entire file in
-- 4. Click "Run"
-- ============================================================


-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
-- Supabase already has a built-in table called auth.users that
-- handles email + password login. We do NOT touch that table.
-- Instead, we create our OWN table called "profiles" that holds
-- everything else about the student: their username, name,
-- state, local government, and class level.
--
-- Each profile is linked to exactly one auth.users record using
-- the same id. This is the standard way Supabase apps work.
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  state text not null,
  lga text not null,
  class_level text,
  is_paid boolean default false,
  trial_start_date timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- This makes searching by username fast, since students will log in with it
create index idx_profiles_username on profiles(username);


-- ============================================================
-- 2. DEVICES TABLE
-- ============================================================
-- Tracks which physical device belongs to which user. This is how
-- we remember a device even after the app is uninstalled and
-- reinstalled, and how we stop one paid account from being used
-- on many devices at once.
-- ============================================================

create table devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  device_fingerprint text unique not null,
  first_seen_at timestamp with time zone default now(),
  is_locked boolean default false
);

create index idx_devices_fingerprint on devices(device_fingerprint);


-- ============================================================
-- 3. LICENSES TABLE
-- ============================================================
-- Tracks every payment made. This replaces the old local "license"
-- table that used to live only inside the phone. Now the SERVER
-- is the only source of truth for who has paid.
-- ============================================================

create table licenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  device_fingerprint text not null,
  payment_reference text unique not null,
  amount_kobo integer not null,
  paid_at timestamp with time zone default now(),
  is_active boolean default true
);


-- ============================================================
-- 4. INSTITUTIONS TABLE
-- ============================================================
-- Same purpose as before: list of Post UTME institutions.
-- ============================================================

create table institutions (
  id bigint generated always as identity primary key,
  name text not null,
  abbreviation text,
  category text not null,
  state text,
  has_post_utme boolean default true
);


-- ============================================================
-- 5. QUESTIONS TABLE
-- ============================================================
-- Same 16 fields as your old local SQLite table. The difference
-- is this table now lives on the server. The app will DOWNLOAD
-- from this table instead of carrying questions inside the
-- install file.
-- ============================================================

create table questions (
  id bigint generated always as identity primary key,
  exam_body text not null,
  institution_id bigint references institutions(id),
  year integer not null,
  subject text not null,
  topic text,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  option_e text,
  correct_option text not null,
  explanation text,
  instruction text,
  passage text,
  passage_group integer
);

create index idx_questions_exam_subject on questions(exam_body, subject);


-- ============================================================
-- 6. GENIUS COMPETITIONS TABLE
-- ============================================================
-- Each row is ONE competition event, e.g. "JAMB Genius Weekly
-- Challenge #1". seconds_per_question is fixed at 15, matching
-- your instruction, but kept as a column in case you want to
-- change it for a future special event.
-- ============================================================

create table competitions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  seconds_per_question integer default 15,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);


-- ============================================================
-- 7. COMPETITION QUESTIONS TABLE
-- ============================================================
-- Links specific questions to a specific competition, in a fixed
-- order, so every participant answers the same questions in the
-- same sequence.
-- ============================================================

create table competition_questions (
  id bigint generated always as identity primary key,
  competition_id uuid references competitions(id) on delete cascade,
  question_id bigint references questions(id),
  question_order integer not null
);

create index idx_comp_questions_competition on competition_questions(competition_id);


-- ============================================================
-- 8. COMPETITION SCORES TABLE
-- ============================================================
-- Every single answer a student submits during a competition is
-- recorded here as its own row. This is the raw data. The
-- leaderboard (next section) adds these rows up per student.
--
-- points is calculated using both correctness AND speed. The
-- exact formula will be applied in the app/server function, but
-- the important columns are is_correct and time_taken_ms.
-- ============================================================

create table competition_scores (
  id bigint generated always as identity primary key,
  competition_id uuid references competitions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  question_id bigint references questions(id),
  is_correct boolean not null,
  time_taken_ms integer not null,
  points integer not null default 0,
  answered_at timestamp with time zone default now(),
  unique (competition_id, user_id, question_id)
);

create index idx_scores_competition_user on competition_scores(competition_id, user_id);


-- ============================================================
-- 9. LEADERBOARD VIEW
-- ============================================================
-- This is not a table you fill in yourself. It is a SAVED QUERY
-- that automatically adds up every student's points for a given
-- competition, and pulls in their username, state, and LGA so
-- the Genius Table can display everything in one single request.
-- ============================================================

create view leaderboard as
select
  cs.competition_id,
  p.id as user_id,
  p.username,
  p.full_name,
  p.state,
  p.lga,
  sum(cs.points) as total_points,
  count(*) filter (where cs.is_correct) as correct_answers,
  sum(cs.time_taken_ms) as total_time_ms
from competition_scores cs
join profiles p on p.id = cs.user_id
group by cs.competition_id, p.id, p.username, p.full_name, p.state, p.lga;


-- ============================================================
-- 10. ROW LEVEL SECURITY (IMPORTANT — DO NOT SKIP)
-- ============================================================
-- By default, Supabase blocks ALL access to a table until you
-- explicitly allow it. This is a safety feature. Without these
-- rules, no student would be able to read or write anything.
-- ============================================================

alter table profiles enable row level security;
alter table devices enable row level security;
alter table licenses enable row level security;
alter table questions enable row level security;
alter table institutions enable row level security;
alter table competitions enable row level security;
alter table competition_questions enable row level security;
alter table competition_scores enable row level security;

-- Anyone logged in can read their OWN profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Anyone logged in can update their OWN profile
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- A new user can create their OWN profile during signup
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Every logged in student can read the full leaderboard view
-- (this is public ranking info, everyone needs to see it)
create policy "Anyone logged in can view profiles for leaderboard"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Every logged in student can read questions (needed to download them)
create policy "Authenticated users can read questions"
  on questions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can read institutions"
  on institutions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can read competitions"
  on competitions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can read competition questions"
  on competition_questions for select
  using (auth.role() = 'authenticated');

-- Students can only see and submit THEIR OWN competition scores directly.
-- (Total leaderboard numbers come from the "leaderboard" view above,
-- which is allowed because it only shows totals, not raw answer data.)
create policy "Users can insert own scores"
  on competition_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can view own scores"
  on competition_scores for select
  using (auth.uid() = user_id);

-- Devices and licenses are private. Only the owning user can see their own.
create policy "Users can view own devices"
  on devices for select
  using (auth.uid() = user_id);

create policy "Users can view own licenses"
  on licenses for select
  using (auth.uid() = user_id);

-- ============================================================
-- END OF SCHEMA
-- ============================================================