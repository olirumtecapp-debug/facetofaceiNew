
-- Adiciona colunas para controle de revanche e placar na tabela rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS winner_id uuid;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rematch_requested_by uuid;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rematch_status text CHECK (rematch_status IN ('idle', 'requested', 'accepted', 'declined')) DEFAULT 'idle';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS match_winner_id uuid;

-- Garante que o score na room_players está correto
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='room_players' AND column_name='score') THEN
        ALTER TABLE public.room_players ADD COLUMN score integer DEFAULT 0;
    END IF;
END $$;

-- Permissões
GRANT ALL ON public.rooms TO authenticated, anon, service_role;
GRANT ALL ON public.room_players TO authenticated, anon, service_role;
