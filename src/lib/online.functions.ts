import { createServerFn } from "@tanstack/react-router";
import { z } from "zod";

export const createRoom = createServerFn({ method: "POST" })
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const code = `FTF-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ code, status: "WAITING" })
      .select()
      .single();

    if (roomError) throw roomError;

    const { error: playerError } = await supabase
      .from("room_players")
      .insert({
        room_id: room.id,
        user_id: userId,
        color: "AZUL",
        is_ready: true
      });

    if (playerError) throw playerError;

    return { room, code };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ code: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("code", data.code)
      .eq("status", "WAITING")
      .single();

    if (roomError || !room) throw new Error("Sala não encontrada ou já iniciada");

    // Check if player already in room
    const { data: existingPlayer } = await supabase
      .from("room_players")
      .select()
      .eq("room_id", room.id)
      .eq("user_id", userId)
      .single();

    if (existingPlayer) return { room };

    const { error: playerError } = await supabase
      .from("room_players")
      .insert({
        room_id: room.id,
        user_id: userId,
        color: "VERMELHO",
        is_ready: true
      });

    if (playerError) throw playerError;

    return { room };
  });
