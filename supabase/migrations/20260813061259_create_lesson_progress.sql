create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_path text not null,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  completion_updated_at timestamptz,
  visited_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_path),
  constraint lesson_progress_path_length check (char_length(lesson_path) between 1 and 512),
  constraint lesson_progress_path_format check (lesson_path ~ '^(phases|certifications)/[A-Za-z0-9._/-]+$'),
  constraint lesson_progress_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint lesson_progress_answers_size check (octet_length(answers::text) <= 65536),
  constraint lesson_progress_completion_timestamp check (completed_at is null or completion_updated_at is not null)
);

alter table public.lesson_progress enable row level security;

revoke all on table public.lesson_progress from anon;
revoke all on table public.lesson_progress from authenticated;
grant select, insert, update, delete on table public.lesson_progress to authenticated;

create policy "Learners can read their own lesson progress"
on public.lesson_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can create their own lesson progress"
on public.lesson_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners can update their own lesson progress"
on public.lesson_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners can delete their own lesson progress"
on public.lesson_progress
for delete
to authenticated
using ((select auth.uid()) = user_id);
