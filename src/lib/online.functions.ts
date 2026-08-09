import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicSupabase } from "./online.server";

export const createRoom = createServerFn({ method: "POST" })
  .inputValidator((data: { guestId: string }) => z.object({ guestId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();

    const code = `FTF-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ 
        code, 
        status: "WAITING",
        host_id: data.guestId
      })
      .select()
      .single();

    if (roomError) throw roomError;

    const { error: playerError } = await supabase
      .from("room_players")
      .insert({ 
        room_id: room.id, 
        guest_id: data.guestId,
        color: "AZUL", 
        is_ready: false 
      });

    if (playerError) throw playerError;

    return { room, code };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; guestId: string }) => z.object({ code: z.string(), guestId: z.string() }).parse(data))
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

    if (existingPlayer) return { room };

    const { error: playerError } = await supabase
      .from("room_players")
      .insert({ 
        room_id: room.id, 
        guest_id: data.guestId,
        color: "VERMELHO", 
        is_ready: false 
      });

    if (playerError) throw playerError;

    return { room };
  });

export const updatePlayerReady = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; guestId: string; isReady: boolean }) => 
    z.object({ roomId: z.string(), guestId: z.string(), isReady: z.boolean() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    await supabase
      .from("room_players")
      .update({ is_ready: data.isReady })
      .eq("room_id", data.roomId)
      .eq("guest_id", data.guestId);
    return { success: true };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator((data: { roomId: string; guestId: string }) => 
    z.object({ roomId: z.string(), guestId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    
    // Only host can start
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", data.roomId).single();
    if (room?.host_id !== data.guestId) throw new Error("Apenas o anfitrião pode iniciar a partida");

    await supabase
      .from("rooms")
      .update({ 
        status: "PLAYING",
        current_turn_player_id: data.guestId 
      })
      .eq("id", data.roomId);
      
    return { success: true };
  });
