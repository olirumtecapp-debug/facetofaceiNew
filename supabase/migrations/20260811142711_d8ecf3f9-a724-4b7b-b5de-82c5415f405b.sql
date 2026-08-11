
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.rooms'::regclass
      AND confrelid = 'auth.users'::regclass
      AND conname LIKE 'rooms_winner_id_fkey%';
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.rooms DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.rooms'::regclass
      AND confrelid = 'auth.users'::regclass
      AND conname LIKE 'rooms_match_winner_id_fkey%';
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.rooms DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.rooms'::regclass
      AND confrelid = 'auth.users'::regclass
      AND conname LIKE 'rooms_rematch_requested_by_fkey%';
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.rooms DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

GRANT ALL ON public.rooms TO anon;
GRANT ALL ON public.room_players TO anon;
