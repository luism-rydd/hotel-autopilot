-- Hotel Autopilot Envigado bootstrap script
-- Creates schema, policies, realtime publication, and mock data for 43 rooms.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null check (status in ('clean', 'dirty', 'occupied', 'maintenance')),
  capacity int not null check (capacity > 0)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  guest text not null,
  checkin date not null,
  checkout date not null,
  status text not null check (status in ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  constraint reservation_dates_valid check (checkout > checkin)
);

create table if not exists public.housekeeping (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  type text not null check (type in ('cleaning', 'linen', 'inspection', 'repair')),
  assigned text not null,
  status text not null check (status in ('pending', 'in_progress', 'done'))
);

alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.housekeeping enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rooms' and policyname = 'rooms_authenticated_all'
  ) then
    create policy rooms_authenticated_all
      on public.rooms
      for all
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reservations' and policyname = 'reservations_authenticated_all'
  ) then
    create policy reservations_authenticated_all
      on public.reservations
      for all
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'housekeeping' and policyname = 'housekeeping_authenticated_all'
  ) then
    create policy housekeeping_authenticated_all
      on public.housekeeping
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end
$$;

-- Keep realtime in sync for the dashboard
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'housekeeping'
  ) then
    alter publication supabase_realtime add table public.housekeeping;
  end if;
end
$$;

-- Mock 43 rooms
insert into public.rooms (name, status, capacity)
select
  'Room ' || to_char(100 + n, 'FM000') as name,
  case
    when n % 11 = 0 then 'maintenance'
    when n % 3 = 0 then 'occupied'
    when n % 2 = 0 then 'dirty'
    else 'clean'
  end as status,
  case
    when n % 7 = 0 then 4
    when n % 5 = 0 then 3
    else 2
  end as capacity
from generate_series(1, 43) as n
on conflict (name) do nothing;

-- Optional seed reservations for dashboard visibility
with seeded_rooms as (
  select id, row_number() over (order by name) as rn
  from public.rooms
)
insert into public.reservations (room_id, guest, checkin, checkout, status)
select
  id,
  'Guest ' || rn,
  current_date + ((rn % 8) - 4),
  current_date + ((rn % 8) + 1),
  case when rn % 6 = 0 then 'pending' when rn % 5 = 0 then 'cancelled' else 'confirmed' end
from seeded_rooms
where rn <= 14
on conflict do nothing;

-- Optional seed housekeeping queue
with seeded_rooms as (
  select id, row_number() over (order by name) as rn
  from public.rooms
)
insert into public.housekeeping (room_id, type, assigned, status)
select
  id,
  case when rn % 4 = 0 then 'inspection' when rn % 3 = 0 then 'linen' else 'cleaning' end,
  case when rn % 3 = 0 then 'Camila' when rn % 2 = 0 then 'Andres' else 'Sofia' end,
  case when rn % 5 = 0 then 'done' when rn % 2 = 0 then 'in_progress' else 'pending' end
from seeded_rooms
where rn <= 18
on conflict do nothing;
