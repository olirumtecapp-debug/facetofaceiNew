
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS winner_id text,
ADD COLUMN IF NOT EXISTS rematch_requested_by text,
ADD COLUMN IF NOT EXISTS rematch_status text DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS match_winner_id text;

-- Ensure score is present in room_players
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='room_players' AND column_name='score') THEN
        ALTER TABLE public.room_players ADD COLUMN score integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='room_players' AND column_name='secret_character_id') THEN
        ALTER TABLE public.room_players ADD COLUMN secret_character_id integer;
    END IF;
END $$;
