import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createRoom = createServerFn({ method: "POST" })
  .handler(async ({ context }: { context: any }) => {
    const { supabase } = context;
    
    const code = `FTF-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ code, status: "WAITING" })
      .select()
      .single();

    if (roomError) throw roomError;

    // We don't necessarily need a userId here for code-based guest play
    const { error: playerError } = await supabase
      .from("room_players")
      .insert({
        room_id: room.id,
        color: "AZUL",
        is_ready: true
      });

    if (playerError) throw playerError;

    return { room, code };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => z.object({ code: z.string() }).parse(data))
  .handler(async ({ data, context }: { data: { code: string }; context: any }) => {
    const { supabase } = context;

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("code", data.code)
      .eq("status", "WAITING")
      .single();

    if (roomError || !room) throw new Error("Sala não encontrada ou já iniciada");

    // In a 1x1 guest model, we just add the second player
    const { error: playerError } = await supabase
      .from("room_players")
      .insert({
        room_id: room.id,
        color: "VERMELHO",
        is_ready: true
      });

    if (playerError) throw playerError;

    return { room };
  });
