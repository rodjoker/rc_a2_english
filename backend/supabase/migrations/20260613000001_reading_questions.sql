-- Add comprehension questions column to reading_texts
alter table public.reading_texts
  add column if not exists questions jsonb;
-- [{q: string, options: string[4], correct: 0-3}]
