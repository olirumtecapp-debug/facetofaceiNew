create table public.rooms (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    status text not null check (status in ('WAITING', 'PLAYING', 'FINISHED')),
    created_at timestamp with time zone default now(),
    winner_id uuid references auth.users(id)
);

create table public.room_players (
    room_id uuid references public.rooms(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    color text not null check (color in ('AZUL', 'VERMELHO')),
    secret_character_id integer,
    score integer default 0,
    is_ready boolean default false,
    last_active timestamp with time zone default now(),
    primary key (room_id, user_id)
);

grant select, insert, update on public.rooms to authenticated;
grant all on public.rooms to service_role;

grant select, insert, update on public.room_players to authenticated;
grant all on public.room_players to service_role;

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

create policy "Users can view rooms they are in"
on public.rooms for select
to authenticated
using (exists (
    select 1 from public.room_players
    where room_id = rooms.id and user_id = auth.uid()
) or status = 'WAITING');

create policy "Anyone can insert a room"
on public.rooms for insert
to authenticated
with check (true);

create policy "Room players can view their room player data"
on public.room_players for select
to authenticated
using (true);

create policy "Users can join rooms"
on public.room_players for insert
to authenticated
with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;