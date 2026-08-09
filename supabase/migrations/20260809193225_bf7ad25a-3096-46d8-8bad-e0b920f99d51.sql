ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS secret_character_id INTEGER;

GRANT SELECT, INSERT, UPDATE ON public.room_players TO authenticated;
GRANT ALL ON public.room_players TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.room_players TO anon;
