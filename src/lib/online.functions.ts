import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicSupabase } from "./online.server";

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
        current_turn_player_id: data.guestId
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
        name: data.playerName
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
          name: data.playerName
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
    const supabase = getPublicSupabase();
    
    // Check if both ready
    const { data: players } = await supabase
      .from("room_players")
      .select("is_ready, guest_id")
      .eq("room_id", data.roomId);
    
    if (!players || players.length < 2 || !players.every(p => p.is_ready)) {
      throw new Error("Ambos os jogadores precisam estar prontos");
    }

    // Assign secret characters for both players on start
    const CHAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    for (const player of players) {
      const randomId = CHAR_IDS[Math.floor(Math.random() * CHAR_IDS.length)];
      await supabase
        .from("room_players")
        .update({ secret_character_id: randomId })
        .eq("room_id", data.roomId)
        .eq("guest_id", player.guest_id);
    }

    const { error } = await supabase
      .from("rooms")
      .update({ status: "PLAYING" })
      .eq("id", data.roomId)
      .eq("host_id", data.guestId);
      
    if (error) throw error;
    return { success: true };
  });
