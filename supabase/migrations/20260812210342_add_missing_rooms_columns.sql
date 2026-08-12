/*
# Add missing columns to rooms table

1. Problem
   The application code inserts/updates `host_id` and `question_asked_by` on the
   `rooms` table, but those columns were never created in the database. This
   causes every "create room" attempt to fail with a PostgREST column-not-found
   error, which surfaces to the user as "Erro ao criar sala".

2. Changes
   - Add `host_id` (uuid, nullable) to `rooms` — stores the guest_id of the
     player who created the room (used for host-only actions like starting the
     game).
   - Add `question_asked_by` (uuid, nullable) to `rooms` — stores the guest_id
     of the player who asked the current question (used to track whose turn it
     is to answer).

3. Security
   No RLS policy changes. Existing policies already allow anon/authenticated
   to insert and update rooms.

4. Notes
   - Both columns are nullable because old rows don't have values.
   - No data is lost; this is purely additive.
*/

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS host_id uuid,
  ADD COLUMN IF NOT EXISTS question_asked_by uuid;
