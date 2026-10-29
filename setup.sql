-- Paste this into Supabase → SQL Editor → Run
create table if not exists public.tasks (
  id bigint primary key,
  title text not null,
  subject text not null,
  type text not null default 'Other',
  due_date date not null,
  priority text not null default 'Medium',
  notes text default '',
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.tasks to anon, authenticated;
grant all on public.tasks to service_role;

alter table public.tasks enable row level security;

-- No login in this app, so anyone with the website can read/write tasks.
create policy "Public can read tasks"   on public.tasks for select to anon, authenticated using (true);
create policy "Public can add tasks"    on public.tasks for insert to anon, authenticated with check (true);
create policy "Public can update tasks" on public.tasks for update to anon, authenticated using (true) with check (true);
create policy "Public can delete tasks" on public.tasks for delete to anon, authenticated using (true);
