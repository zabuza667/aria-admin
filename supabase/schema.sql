-- Schéma Supabase pour Aria
-- Colle ce SQL dans l'éditeur SQL de Supabase

-- Activer les extensions
create extension if not exists "uuid-ossp";

-- Table profiles (liée à auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  name text,
  role text default 'admin',
  lang text default 'fr',
  avatar text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- RLS profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Table tasks
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'moyenne',
  due_date date,
  assignee text,
  created_at timestamp with time zone default timezone('utc', now())
);
alter table public.tasks enable row level security;
create policy "Users manage own tasks" on public.tasks for all using (auth.uid() = user_id);

-- Table events (calendar)
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  time time,
  duration integer default 60,
  type text default 'meeting',
  location text,
  attendees text[],
  created_at timestamp with time zone default timezone('utc', now())
);
alter table public.events enable row level security;
create policy "Users manage own events" on public.events for all using (auth.uid() = user_id);

-- Table invoices
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  number text,
  client text not null,
  amount numeric not null,
  status text default 'pending',
  date date,
  due_date date,
  category text,
  created_at timestamp with time zone default timezone('utc', now())
);
alter table public.invoices enable row level security;
create policy "Users manage own invoices" on public.invoices for all using (auth.uid() = user_id);

-- Table contacts (CRM)
create table public.contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  type text default 'prospect',
  status text default 'warm',
  notes text,
  last_contact date,
  created_at timestamp with time zone default timezone('utc', now())
);
alter table public.contacts enable row level security;
create policy "Users manage own contacts" on public.contacts for all using (auth.uid() = user_id);

-- Table employees (HR)
create table public.employees (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid,
  name text not null,
  role text,
  email text,
  phone text,
  contract text default 'CDI',
  start_date date,
  leave_balance integer default 25,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc', now())
);

-- Table logs
create table public.logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  message text not null,
  type text default 'info',
  section text,
  created_at timestamp with time zone default timezone('utc', now())
);
alter table public.logs enable row level security;
create policy "Users manage own logs" on public.logs for all using (auth.uid() = user_id);
