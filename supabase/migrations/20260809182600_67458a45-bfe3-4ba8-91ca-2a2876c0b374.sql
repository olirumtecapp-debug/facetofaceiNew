
-- Ensure rooms table has the right structure
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS host_id text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS winner_id text;

-- Check if guest_id exists in room_players, if not add it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_players' AND column_name = 'guest_id') THEN
        ALTER TABLE public.room_players ADD COLUMN guest_id text;
    END IF;
END $$;

-- Enable Realtime for rooms and room_players
-- We try to enable it for the whole public schema or specific tables if possible
-- This varies by Supabase setup, but usually standard on Lovable

-- Policies for anon access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_players TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.room_players TO service_role;

-- RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon update rooms" ON public.rooms;
CREATE POLICY "Allow anon read rooms" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert rooms" ON public.rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update rooms" ON public.rooms FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read players" ON public.room_players;
DROP POLICY IF EXISTS "Allow anon insert players" ON public.room_players;
DROP POLICY IF EXISTS "Allow anon update players" ON public.room_players;
CREATE POLICY "Allow anon read players" ON public.room_players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert players" ON public.room_players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update players" ON public.room_players FOR UPDATE TO anon, authenticated USING (true);
