create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists todos_user_created_at_idx
  on public.todos (user_id, created_at desc);

alter table public.todos enable row level security;

drop policy if exists "Users can read their own tasks" on public.todos;
create policy "Users can read their own tasks"
  on public.todos for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own tasks" on public.todos;
create policy "Users can create their own tasks"
  on public.todos for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tasks" on public.todos;
create policy "Users can update their own tasks"
  on public.todos for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tasks" on public.todos;
create policy "Users can delete their own tasks"
  on public.todos for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.todos to authenticated;
