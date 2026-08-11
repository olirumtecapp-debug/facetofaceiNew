import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicSupabase } from "./online.server";
import { CHARACTERS } from "@/data/characters";


export const createRoom = createServerFn({ method: "POST" })
  .inputValidator((data: { guestId: string; playerName: string }) => 
    z.object({ guestId: z.string(), playerName: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();

    const code = `FTF-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ 
        code, 
        status: "WAITING",
        host_id: data.guestId,
        current_turn_player_id: data.guestId,
        rematch_status: 'idle'
      })
      .select()
      .single();

    if (roomError) throw roomError;

    const { error: playerError } = await supabase
      .from("room_players")
      .insert({ 
        room_id: room.id, 
        color: "AZUL", 
        is_ready: false,
        guest_id: data.guestId,
        name: data.playerName,
        score: 0
      });

    if (playerError) throw playerError;

    return { room, code };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; guestId: string; playerName: string }) => 
    z.object({ code: z.string(), guestId: z.string(), playerName: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("code", data.code)
      .eq("status", "WAITING")
      .maybeSingle();

    if (roomError || !room) throw new Error("Sala não encontrada ou já iniciada");

    // Check if player already in room
    const { data: existingPlayer } = await supabase
      .from("room_players")
      .select()
      .eq("room_id", room.id)
      .eq("guest_id", data.guestId)
      .maybeSingle();

    if (!existingPlayer) {
      const { error: playerError } = await supabase
        .from("room_players")
        .insert({ 
          room_id: room.id, 
          color: "VERMELHO", 
          is_ready: false,
          guest_id: data.guestId,
          name: data.playerName,
          score: 0
        });
      if (playerError) throw playerError;
    } else {
      // Update name if already exists
      await supabase
        .from("room_players")
        .update({ name: data.playerName })
        .eq("room_id", room.id)
        .eq("guest_id", data.guestId);
    }

    return { room };
  });

export const toggleReady = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; guestId: string; isReady: boolean }) => 
    z.object({ roomId: z.string(), guestId: z.string(), isReady: z.boolean() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { error } = await supabase
      .from("room_players")
      .update({ is_ready: data.isReady })
      .eq("room_id", data.roomId)
      .eq("guest_id", data.guestId);
    if (error) throw error;
    return { success: true };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; guestId: string }) => 
    z.object({ roomId: z.string(), guestId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    
    // Check if both ready
    const { data: players } = await supabase
      .from("room_players")
      .select("is_ready, guest_id, name")
      .eq("room_id", data.roomId);
    
    if (!players || players.length < 2 || !players.every(p => p.is_ready)) {
      throw new Error("Ambos os jogadores precisam estar prontos");
    }

    // 1. Assign secret characters for both players on start (WITHOUT REPETITION)
    const CHAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    
    // Fisher-Yates shuffle
    for (let i = CHAR_IDS.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j]!, CHAR_IDS[i]!];
    }

    // Assign unique characters
    for (let i = 0; i < players.length; i++) {
      const player = players[i]!;
      const characterId = CHAR_IDS[i]!;
      await supabase
        .from("room_players")
        .update({ secret_character_id: characterId })
        .eq("room_id", data.roomId)
        .eq("guest_id", player.guest_id);
    }

    const { error } = await supabase
      .from("rooms")
      .update({ 
        status: "PLAYING",
        winner_id: null as any,
        match_winner_id: null as any, // Reset match winner if starting fresh (though usually starts at WAITING)
        rematch_status: 'idle',
        rematch_requested_by: null as any,
        current_question_id: null as any,
        last_answer: null as any,
        question_asked_by: null as any,
        last_action_timestamp: new Date().toISOString()
      })
      .eq("id", data.roomId)
      .eq("host_id", data.guestId);
      
    if (error) throw error;
    return { success: true };
  });

export const declareWinner = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; winnerId: string }) => 
    z.object({ roomId: z.string(), winnerId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    // DIAGNÓSTICO: Registrar entrada na função
    console.log("[SERVER] declareWinner called", data);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    // 1. Fetch current score
    const { data: player, error: playerError } = await supabase
      .from("room_players")
      .select("score, room_id, guest_id")
      .eq("room_id", data.roomId)
      .eq("guest_id", data.winnerId)
      .maybeSingle();

    if (playerError) {
      console.error("[SERVER] DB_FETCH_SCORE_ERROR", playerError);
      throw playerError;
    }

    if (!player) {
      const errorMsg = `PLAYER_NOT_FOUND: roomId=${data.roomId}, winnerId=${data.winnerId}`;
      console.error("[SERVER]", errorMsg);
      throw new Error(errorMsg);
    }

    const newScore = (player.score || 0) + 1;
    console.log("[SERVER] Updating score to:", newScore);

    // 2. Update player score
    const { error: scoreUpdateError } = await supabase
      .from("room_players")
      .update({ score: newScore })
      .eq("room_id", data.roomId)
      .eq("guest_id", data.winnerId);
      
    if (scoreUpdateError) {
      console.error("[SERVER] DB_UPDATE_SCORE_ERROR", scoreUpdateError);
      throw scoreUpdateError;
    }

    // 3. Update room status
    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({ 
        winner_id: data.winnerId as any,
        status: "FINISHED",
        last_action_timestamp: new Date().toISOString()
      })
      .eq("id", data.roomId);
    
    if (roomUpdateError) {
      console.error("[SERVER] DB_UPDATE_ROOM_ERROR", roomUpdateError);
      throw roomUpdateError;
    }

    // 3. Check if overall match winner (Best of 5 -> 3 wins)
    if (newScore >= 3) {
      await supabase
        .from("rooms")
        .update({ match_winner_id: data.winnerId as any })
        .eq("id", data.roomId);
    }

    return { success: true, newScore };
  });

export const requestRematch = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; guestId: string }) => 
    z.object({ roomId: z.string(), guestId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { error } = await supabase
      .from("rooms")
      .update({ 
        rematch_requested_by: data.guestId as any,
        rematch_status: 'requested'
      })
      .eq("id", data.roomId);
    
    if (error) throw error;
    return { success: true };
  });

export const handleRematchResponse = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; guestId: string; accept: boolean }) => 
    z.object({ roomId: z.string(), guestId: z.string(), accept: z.boolean() }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;


    if (data.accept) {
      // 1. Assign secret characters for both players (WITHOUT REPETITION)
      const CHAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
      
      // Fisher-Yates shuffle
      for (let i = CHAR_IDS.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j]!, CHAR_IDS[i]!];
      }

      const { data: players } = await supabase
        .from("room_players")
        .select("guest_id")
        .eq("room_id", data.roomId);

      if (players && players.length >= 2) {
        for (let i = 0; i < players.length; i++) {
          const player = players[i]!;
          const characterId = CHAR_IDS[i]!;
          await supabase
            .from("room_players")
            .update({ secret_character_id: characterId })
            .eq("room_id", data.roomId)
            .eq("guest_id", player.guest_id);
        }
      }

      // Identify who lost the last round to start the next
      const { data: room } = await supabase
        .from("rooms")
        .select("winner_id")
        .eq("id", data.roomId)
        .single();
      
      const lastWinnerId = room?.winner_id;
      const nextStarter = players?.find(p => p.guest_id !== lastWinnerId)?.guest_id || data.guestId;

      const { error } = await supabase
        .from("rooms")
        .update({ 
          status: "PLAYING",
          winner_id: null as any,
          rematch_status: 'accepted',
          rematch_requested_by: null as any,
          current_question_id: null as any,
          last_answer: null as any,
          question_asked_by: null as any,
          current_turn_player_id: nextStarter as any,
          last_action_timestamp: new Date().toISOString()
        })
        .eq("id", data.roomId);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("rooms")
        .update({ rematch_status: 'declined' })
        .eq("id", data.roomId);
      if (error) throw error;
    }

    return { success: true };
  });

export const abandonMatch = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; guestId: string }) => 
    z.object({ roomId: z.string(), guestId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    // 1. Get room players to find the winner
    const { data: players } = await supabase
      .from("room_players")
      .select("guest_id")
      .eq("room_id", data.roomId);

    if (!players || players.length === 0) throw new Error("Sala não encontrada");

    const winner = players.find(p => p.guest_id !== data.guestId);
    if (!winner) throw new Error("Adversário não encontrado");

    // 2. Authoritative match end
    const { error } = await supabase
      .from("rooms")
      .update({ 
        status: "FINISHED",
        match_winner_id: winner.guest_id as any,
        winner_id: winner.guest_id as any,
        last_action_timestamp: new Date().toISOString(),
        rematch_status: 'declined' // No rematch possible if abandoned
      })
      .eq("id", data.roomId);

    if (error) throw error;
    return { success: true };
  });
