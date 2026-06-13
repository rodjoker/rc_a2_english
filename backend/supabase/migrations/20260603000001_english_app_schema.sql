-- =============================================
-- English A2 Learning App — Schema
-- Migration: 20260603000001
-- =============================================


-- =============================================
-- CONTENT TABLES (seeded by admin, read-only for users)
-- =============================================

-- 1. Vocabulary Words (900 words, 15/day × 60 days)
create table public.vocabulary_words (
  id               uuid primary key default gen_random_uuid(),
  day_number       int  not null,
  word             text not null,
  pronunciation    text,
  translation      text not null,
  example_sentence text,
  category         text not null,   -- 'programming_core', 'web_development', 'databases_data',
                                    -- 'cloud_devops', 'agile_process', 'office_workplace',
                                    -- 'meetings_communication', 'informal_office',
                                    -- 'soft_skills_career', 'security_systems'
  is_required      boolean not null default false,
  word_order       int,             -- 1-5 for the 5 required words of the day
  created_at       timestamptz default now()
);

create index on public.vocabulary_words (day_number);
create index on public.vocabulary_words (day_number, is_required);


-- 2. Grammar Lessons (1 per day, 60 total, 9 units)
create table public.grammar_lessons (
  id             uuid primary key default gen_random_uuid(),
  day_number     int  not null unique,
  unit_number    int  not null,
  title          text not null,
  explanation    text not null,
  grammar_table  jsonb,   -- {rows: [{label, positive, negative, question}]}
  examples       jsonb,   -- [{en: '...', es: '...'}]
  exercises      jsonb,   -- [{sentence: '...', blank_index: 0, answer: '...', hint: '...'}]
  created_at     timestamptz default now()
);

create index on public.grammar_lessons (day_number);


-- 3. Interview Questions (130 questions, 2/day)
create table public.interview_questions (
  id             uuid primary key default gen_random_uuid(),
  day_number     int  not null,
  question_order int  not null,   -- 1 or 2
  question_en    text not null,
  category       text not null,   -- 'introduction','experience','technical','behavioral',
                                  -- 'teamwork','motivation','soft_skills','programming','closing'
  tips           jsonb,           -- ["tip 1", "tip 2", ...]
  sample_answer  text,
  keywords       jsonb,           -- [{word: '...', translation: '...'}]
  min_day        int  not null default 1,
  created_at     timestamptz default now(),
  unique (day_number, question_order)
);

create index on public.interview_questions (day_number);


-- 4. Reading Texts (1 per day, 60 total)
create table public.reading_texts (
  id                uuid primary key default gen_random_uuid(),
  day_number        int  not null unique,
  title             text not null,
  level             text not null default 'A2',
  content           text not null,
  estimated_minutes int  not null default 5,
  hints             jsonb,   -- [{word: '...', translation: '...'}]
  created_at        timestamptz default now()
);

create index on public.reading_texts (day_number);


-- 5. Daily Test Questions
create table public.daily_tests (
  id             uuid primary key default gen_random_uuid(),
  day_number     int  not null,
  test_type      text not null,   -- 'daily', 'weekly', 'midterm', 'final'
  question_order int  not null,
  question_type  text not null,   -- 'multiple_choice', 'fill_blank', 'write_word'
  question       text not null,
  options        jsonb,           -- ["opt_a", "opt_b", "opt_c", "opt_d"] for multiple_choice
  correct_answer text not null,
  points         int  not null default 10,
  created_at     timestamptz default now()
);

create index on public.daily_tests (day_number, test_type);


-- =============================================
-- USER PROGRESS TABLES
-- =============================================

-- 6. User Learning Profile (extends profiles — created automatically on signup)
create table public.user_learning_profiles (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  current_day     int  not null default 1,
  streak          int  not null default 0,
  longest_streak  int  not null default 0,
  last_active_date date,
  started_at      timestamptz default now(),
  updated_at      timestamptz default now()
);


-- 7. Daily Task Progress (one row per user per day)
create table public.user_daily_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  day_number       int  not null,
  task1_done       boolean not null default false,   -- Vocabulary
  task2_done       boolean not null default false,   -- Reading
  task3_done       boolean not null default false,   -- Grammar
  task4_done       boolean not null default false,   -- Interview
  task5_done       boolean not null default false,   -- Test
  task5_best_score int  not null default 0,
  completed_at     timestamptz,                      -- set when all 5 tasks done
  updated_at       timestamptz default now(),
  unique (user_id, day_number)
);

create index on public.user_daily_progress (user_id, day_number);


-- 8. Vocabulary Practice Progress (per word per day)
create table public.user_vocabulary_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  word_id           uuid not null references public.vocabulary_words(id) on delete cascade,
  day_number        int  not null,
  correct_attempts  int  not null default 0,
  total_attempts    int  not null default 0,
  mastered          boolean not null default false,
  last_practiced_at timestamptz,
  unique (user_id, word_id, day_number)
);

create index on public.user_vocabulary_progress (user_id, day_number);


-- 9. Test Attempts (full history; best score tracked in user_daily_progress)
create table public.user_test_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  day_number   int  not null,
  test_type    text not null,
  score        int  not null,
  passed       boolean generated always as (score >= 70) stored,
  answers      jsonb,   -- [{question_id, user_answer, correct}]
  attempted_at timestamptz default now()
);

create index on public.user_test_attempts (user_id, day_number);


-- 10. Reading Progress (hints clicked + completion)
create table public.user_reading_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  reading_id     uuid not null references public.reading_texts(id) on delete cascade,
  hints_clicked  jsonb not null default '[]',   -- ["word1", "word2"]
  completed      boolean not null default false,
  completed_at   timestamptz,
  unique (user_id, reading_id)
);


-- =============================================
-- RLS
-- =============================================

-- Content: authenticated users read-only
alter table public.vocabulary_words      enable row level security;
alter table public.grammar_lessons       enable row level security;
alter table public.interview_questions   enable row level security;
alter table public.reading_texts         enable row level security;
alter table public.daily_tests           enable row level security;

create policy "read vocabulary"
  on public.vocabulary_words for select to authenticated using (true);

create policy "read grammar"
  on public.grammar_lessons for select to authenticated using (true);

create policy "read interview questions"
  on public.interview_questions for select to authenticated using (true);

create policy "read reading texts"
  on public.reading_texts for select to authenticated using (true);

create policy "read daily tests"
  on public.daily_tests for select to authenticated using (true);


-- Progress: users only access their own rows
-- (select auth.uid()) cached once per query — faster than auth.uid() per row
alter table public.user_learning_profiles  enable row level security;
alter table public.user_daily_progress     enable row level security;
alter table public.user_vocabulary_progress enable row level security;
alter table public.user_test_attempts      enable row level security;
alter table public.user_reading_progress   enable row level security;

create policy "own learning profile"
  on public.user_learning_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own daily progress"
  on public.user_daily_progress for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own vocabulary progress"
  on public.user_vocabulary_progress for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own test attempts"
  on public.user_test_attempts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own reading progress"
  on public.user_reading_progress for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


-- =============================================
-- GRANTS
-- =============================================

grant select on public.vocabulary_words       to authenticated;
grant select on public.grammar_lessons        to authenticated;
grant select on public.interview_questions    to authenticated;
grant select on public.reading_texts          to authenticated;
grant select on public.daily_tests            to authenticated;

grant select, insert, update, delete on public.user_learning_profiles   to authenticated;
grant select, insert, update, delete on public.user_daily_progress       to authenticated;
grant select, insert, update, delete on public.user_vocabulary_progress  to authenticated;
grant select, insert, update         on public.user_test_attempts         to authenticated;
grant select, insert, update         on public.user_reading_progress      to authenticated;


-- =============================================
-- AUTO-CREATE LEARNING PROFILE ON SIGNUP
-- Creates user_learning_profiles row when profiles row is inserted
-- =============================================
create or replace function public.handle_new_learning_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_learning_profiles (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_learning_profile();
