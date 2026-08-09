-- Add columns for real-time synchronization
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_question_id text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_answer text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_turn_player_id uuid;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_action_timestamp timestamp with time zone DEFAULT now();

-- Ensure room_players has secret_character_id for sync
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS secret_character_id integer;

-- GRANTs to ensure data API access
GRANT ALL ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO anon;
GRANT ALL ON public.rooms TO service_role;

GRANT ALL ON public.room_players TO authenticated;
GRANT ALL ON public.room_players TO anon;
GRANT ALL ON public.room_players TO service_role;
