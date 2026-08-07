-- Drop existing primary key and policies to allow changes
alter table public.room_players drop constraint room_players_pkey;

-- Allow NULL user_id
alter table public.room_players alter column user_id drop not null;

-- Add guest_id if it doesn't exist (it failed last time, let's check or just try)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='room_players' and column_name='guest_id') then
        alter table public.room_players add column guest_id uuid default gen_random_uuid() not null;
    end if;
end $$;

-- Set new primary key
alter table public.room_players add primary key (room_id, guest_id);

-- Update RLS and GRANTS for anonymous access
grant select, insert, update on public.rooms to anon;
grant select, insert, update on public.room_players to anon;

-- Re-create policies with anon support
drop policy if exists "Users can view rooms they are in" on public.rooms;
drop policy if exists "Anyone can insert a room" on public.rooms;
drop policy if exists "Room players can view their room player data" on public.room_players;
drop policy if exists "Users can join rooms" on public.room_players;

create policy "Anon can insert rooms"
on public.rooms for insert
to anon, authenticated
with check (true);

create policy "Anon can view rooms"
on public.rooms for select
to anon, authenticated
using (true);

create policy "Anon can join room players"
on public.room_players for insert
to anon, authenticated
with check (true);

create policy "Anon can view room players"
on public.room_players for select
to anon, authenticated
using (true);

create policy "Anon can update room players"
on public.room_players for update
to anon, authenticated
using (true);