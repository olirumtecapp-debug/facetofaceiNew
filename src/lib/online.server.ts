import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Server-only Supabase client using the service role key.
 * All writes to `rooms` / `room_players` happen here, because anonymous
 * clients no longer have write access to those tables (RLS + grants).
 */
export function getPublicSupabase() {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function getRoomByCode(code: string) {
  const supabase = getPublicSupabase();
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, status, current_turn_player_id, winner_id")
    .eq("code", code)
    .maybeSingle();
  if (error || !room) throw new Error("Sala não encontrada");
  return room;
}

async function assertMember(roomId: string, guestId: string) {
  const supabase = getPublicSupabase();
  const { data: player } = await supabase
    .from("room_players")
    .select("guest_id")
    .eq("room_id", roomId)
    .eq("guest_id", guestId)
    .maybeSingle();
  if (!player) throw new Error("Jogador não pertence a esta sala");
}

export async function svcSetTurn(code: string, guestId: string, nextPlayerId: string | null) {
  const supabase = getPublicSupabase();
  const room = await getRoomByCode(code);
  await assertMember(room.id, guestId);

  await supabase
    .from("rooms")
    .update({
      current_turn_player_id: nextPlayerId as any,
      last_answer: null as any,
      current_question_id: null as any,
      question_asked_by: null as any,
      last_action_timestamp: new Date().toISOString(),
    })
    .eq("id", room.id);

  return { success: true };
}

export async function svcSendQuestion(code: string, guestId: string, questionId: string) {
  const supabase = getPublicSupabase();
  const room = await getRoomByCode(code);
  await assertMember(room.id, guestId);

  const { error } = await supabase
    .from("rooms")
    .update({
      current_question_id: questionId,
      last_answer: null as any,
      question_asked_by: guestId,
      last_action_timestamp: new Date().toISOString(),
    })
    .eq("id", room.id);
  if (error) throw error;
  return { success: true };
}

export async function svcSendAnswer(code: string, guestId: string, answer: "SIM" | "NÃO") {
  const supabase = getPublicSupabase();
  const room = await getRoomByCode(code);
  await assertMember(room.id, guestId);

  const { error } = await supabase
    .from("rooms")
    .update({
      last_answer: answer,
      current_question_id: null as any,
      question_asked_by: guestId,
      last_action_timestamp: new Date().toISOString(),
    })
    .eq("id", room.id);
  if (error) throw error;
  return { success: true };
}

/**
 * Returns the caller's own secret character. The opponent's secret is only
 * disclosed once the round is finished — never while the game is running.
 */
export async function svcGetSecrets(code: string, guestId: string) {
  const supabase = getPublicSupabase();
  const room = await getRoomByCode(code);

  const { data: players } = await supabase
    .from("room_players")
    .select("guest_id, secret_character_id")
    .eq("room_id", room.id);

  const me = players?.find((p) => p.guest_id === guestId);
  if (!me) throw new Error("Jogador não pertence a esta sala");

  const opponent = players?.find((p) => p.guest_id !== guestId);
  const finished = room.status === "FINISHED" || !!room.winner_id;

  return {
    roomId: room.id,
    mySecretId: me.secret_character_id ?? null,
    opponentSecretId: finished ? opponent?.secret_character_id ?? null : null,
  };
}

/**
 * Authoritative guess resolution: the comparison against the opponent's
 * secret character happens server-side so the secret never reaches clients.
 */
export async function svcSubmitGuess(roomId: string, guestId: string, characterId: number) {
  const supabase = getPublicSupabase();
  await assertMember(roomId, guestId);

  const { data: players } = await supabase
    .from("room_players")
    .select("guest_id, secret_character_id, score")
    .eq("room_id", roomId);

  const opponent = players?.find((p) => p.guest_id !== guestId);
  if (!opponent) throw new Error("Adversário não encontrado");

  const isCorrect = opponent.secret_character_id === characterId;
  const winnerId = isCorrect ? guestId : opponent.guest_id;
  const winner = players?.find((p) => p.guest_id === winnerId);
  const newScore = (winner?.score || 0) + 1;

  await supabase
    .from("room_players")
    .update({ score: newScore })
    .eq("room_id", roomId)
    .eq("guest_id", winnerId);

  await supabase
    .from("rooms")
    .update({
      winner_id: winnerId as any,
      status: "FINISHED",
      last_action_timestamp: new Date().toISOString(),
      ...(newScore >= 3 ? { match_winner_id: winnerId as any } : {}),
    })
    .eq("id", roomId);

  return { isCorrect, winnerId, newScore, opponentSecretId: opponent.secret_character_id ?? null };
}
