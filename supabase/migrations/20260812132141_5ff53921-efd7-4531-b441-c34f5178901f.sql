-- ============ games (not used by the app; fully private) ============
DROP POLICY IF EXISTS "Allow all to games" ON public.games;
REVOKE ALL ON public.games FROM anon, authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to games" ON public.games FOR SELECT USING (false);

-- ============ rooms ============
DROP POLICY IF EXISTS "Allow all to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow participant update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow select rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anon can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anon can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Public can create rooms" ON public.rooms;

REVOKE ALL ON public.rooms FROM anon, authenticated;
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read room state" ON public.rooms FOR SELECT TO anon, authenticated USING (true);

-- ============ room_players ============
DROP POLICY IF EXISTS "Allow all to room_players" ON public.room_players;
DROP POLICY IF EXISTS "Allow anon insert players" ON public.room_players;
DROP POLICY IF EXISTS "Allow anon read players" ON public.room_players;
DROP POLICY IF EXISTS "Allow anon update players" ON public.room_players;
DROP POLICY IF EXISTS "Allow select players" ON public.room_players;
DROP POLICY IF EXISTS "Allow self update players" ON public.room_players;
DROP POLICY IF EXISTS "Anon can join room players" ON public.room_players;
DROP POLICY IF EXISTS "Anon can update room players" ON public.room_players;
DROP POLICY IF EXISTS "Anon can view room players" ON public.room_players;
DROP POLICY IF EXISTS "Public can join rooms as player" ON public.room_players;

REVOKE ALL ON public.room_players FROM anon, authenticated;
-- column-level grant: secret_character_id is intentionally excluded
GRANT SELECT (room_id, user_id, color, score, is_ready, last_active, guest_id, name)
  ON public.room_players TO anon, authenticated;
GRANT ALL ON public.room_players TO service_role;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read player state" ON public.room_players FOR SELECT TO anon, authenticated USING (true);