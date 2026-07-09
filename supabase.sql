-- Схема для CRM юриста. Выполнить в Supabase → SQL Editor.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  status text not null default 'Новый'
    check (status in ('Новый', 'В работе', 'Закрыт')),
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Прототип: открытый доступ по anon-ключу.
-- Для продакшена заменить на политику с привязкой к auth.uid() (каждый юрист видит своих клиентов).
create policy "anon full access" on public.clients
  for all
  using (true)
  with check (true);
