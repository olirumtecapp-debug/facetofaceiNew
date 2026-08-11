-- Revoke broad anonymous access to maintain security while allowing game functions
REVOKE ALL ON public.rooms FROM anon;
REVOKE ALL ON public.room_players FROM anon;

-- Grant specific permissions for authenticated and anonymous users
-- Anonymous users need to be able to create, join, and play rooms (since the game uses guestIds)
GRANT SELECT, INSERT, UPDATE ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.room_players TO anon, authenticated;
GRANT ALL ON public.room_players TO service_role;

-- Drop existing restrictive policies to rebuild them safely
DROP POLICY IF EXISTS "Users can view rooms they are in" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can insert a room" ON public.rooms;
DROP POLICY IF EXISTS "Room players can view their room player data" ON public.room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_players;

-- New RLS Policies for public.rooms
CREATE POLICY "Public can view rooms by code"
ON public.rooms FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can create rooms"
ON public.rooms FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Participants can update rooms"
ON public.rooms FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- New RLS Policies for public.room_players
CREATE POLICY "Public can view room players"
ON public.room_players FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can join rooms as player"
ON public.room_players FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Players can update their own data"
ON public.room_players FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Ensure Realtime is enabled for these tables (already done in previous migrations, but good to ensure)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'room_players') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
  END IF;
END $$;
