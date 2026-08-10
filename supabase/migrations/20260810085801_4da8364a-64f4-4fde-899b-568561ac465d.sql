-- Create room_players table first to allow references
CREATE TABLE IF NOT EXISTS public.room_players (
    room_id uuid NOT NULL,
    guest_id text NOT NULL,
    user_id uuid,
    name text,
    color text NOT NULL,
    is_ready boolean DEFAULT false,
    secret_character_id integer,
    score integer DEFAULT 0,
    last_active timestamp with time zone DEFAULT now(),
    PRIMARY KEY (room_id, guest_id)
);

-- Update or create rooms table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rooms') THEN
        CREATE TABLE public.rooms (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            code text UNIQUE NOT NULL,
            host_id text,
            status text NOT NULL DEFAULT 'waiting',
            current_turn_player_id text,
            current_question text,
            question_asked_by text,
            current_answer text,
            player1_characters jsonb,
            player2_characters jsonb,
            game_history jsonb DEFAULT '[]',
            winner_id text,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    ELSE
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS host_id text;
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_question text;
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS question_asked_by text;
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS player1_characters jsonb;
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS player2_characters jsonb;
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS game_history jsonb DEFAULT '[]';
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- CREATE THE SPECIFIC 'games' TABLE REQUESTED BY THE USER
CREATE TABLE IF NOT EXISTS public.games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "gameCode" text UNIQUE NOT NULL,
    "player1Id" text,
    "player1Name" text,
    "player2Id" text,
    "player2Name" text,
    "gameStatus" text DEFAULT 'waiting',
    "currentTurn" text,
    "currentQuestion" text,
    "questionAskedBy" text,
    "currentAnswer" text,
    "player1Characters" jsonb,
    "player2Characters" jsonb,
    "gameHistory" jsonb DEFAULT '[]',
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon;
GRANT ALL ON public.games TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_players TO anon;
GRANT ALL ON public.room_players TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon;
GRANT ALL ON public.rooms TO service_role;

-- RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Simple policies for game synchronization
CREATE POLICY "Allow all to games" ON public.games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to room_players" ON public.room_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
