import { supabase } from "@/integrations/supabase/client";

export const createRoom = async (payload: { data: { guestId: string; playerName: string } }) => {
  const { guestId, playerName } = payload.data;
  const code = `FTF-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({ 
      code, 
      status: "WAITING",
      host_id: guestId,
      current_turn_player_id: guestId,
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
      guest_id: guestId,
      name: playerName,
      score: 0
    });

  if (playerError) throw playerError;

  return { room, code };
};

export const joinRoom = async (payload: { data: { code: string; guestId: string; playerName: string } }) => {
  const { code, guestId, playerName } = payload.data;

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("code", code)
    .eq("status", "WAITING")
    .maybeSingle();

  if (roomError || !room) throw new Error("Sala não encontrada ou já iniciada");

  const { data: existingPlayer } = await supabase
    .from("room_players")
    .select()
    .eq("room_id", room.id)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (!existingPlayer) {
    const { error: playerError } = await supabase
      .from("room_players")
      .insert({ 
        room_id: room.id, 
        color: "VERMELHO", 
        is_ready: false,
        guest_id: guestId,
        name: playerName,
        score: 0
      });
    if (playerError) throw playerError;
  } else {
    await supabase
      .from("room_players")
      .update({ name: playerName })
      .eq("room_id", room.id)
      .eq("guest_id", guestId);
  }

  return { room };
};

export const toggleReady = async (payload: { data: { roomId: string; guestId: string; isReady: boolean } }) => {
  const { roomId, guestId, isReady } = payload.data;
  const { error } = await supabase
    .from("room_players")
    .update({ is_ready: isReady })
    .eq("room_id", roomId)
    .eq("guest_id", guestId);
  if (error) throw error;
  return { success: true };
};

export const startGame = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;

  const { data: players } = await supabase
    .from("room_players")
    .select("is_ready, guest_id, name")
    .eq("room_id", roomId);
  
  if (!players || players.length < 2 || !players.every(p => p.is_ready)) {
    throw new Error("Ambos os jogadores precisam estar prontos");
  }

  const CHAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  for (let i = CHAR_IDS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j]!, CHAR_IDS[i]!];
  }

  for (let i = 0; i < players.length; i++) {
    const player = players[i]!;
    const characterId = CHAR_IDS[i]!;
    await supabase
      .from("room_players")
      .update({ secret_character_id: characterId })
      .eq("room_id", roomId)
      .eq("guest_id", player.guest_id);
  }

  const { error } = await supabase
    .from("rooms")
    .update({ 
      status: "PLAYING",
      winner_id: null as any,
      match_winner_id: null as any,
      rematch_status: 'idle',
      rematch_requested_by: null as any,
      current_question_id: null as any,
      last_answer: null as any,
      question_asked_by: null as any,
      current_turn_player_id: guestId,
      last_action_timestamp: new Date().toISOString()
    })
    .eq("id", roomId)
    .eq("host_id", guestId);
    
  if (error) throw error;
  return { success: true };
};

export const sendQuestion = async (payload: { data: { code: string; guestId: string; questionId: string } }) => {
  const { code, guestId, questionId } = payload.data;
  const { error } = await supabase
    .from("rooms")
    .update({
      current_question_id: questionId,
      last_answer: null as any,
      question_asked_by: guestId,
      last_action_timestamp: new Date().toISOString()
    })
    .eq("code", code);
  if (error) throw error;
  return { success: true };
};

export const sendAnswer = async (payload: { data: { code: string; guestId: string; answer: "SIM" | "NÃO" } }) => {
  const { code, guestId, answer } = payload.data;
  const { error } = await supabase
    .from("rooms")
    .update({
      last_answer: answer,
      current_question_id: null as any,
      question_asked_by: guestId,
      last_action_timestamp: new Date().toISOString()
    })
    .eq("code", code);
  if (error) throw error;
  return { success: true };
};

export const setTurn = async (payload: { data: { code: string; guestId: string; nextPlayerId: string | null } }) => {
  const { code, nextPlayerId } = payload.data;
  const { error } = await supabase
    .from("rooms")
    .update({
      current_turn_player_id: nextPlayerId as any,
      last_answer: null as any,
      current_question_id: null as any,
      question_asked_by: null as any,
      last_action_timestamp: new Date().toISOString()
    })
    .eq("code", code);
  if (error) throw error;
  return { success: true };
};

export const submitGuess = async (payload: { data: { roomId: string; guestId: string; characterId: number } }) => {
  const { roomId, guestId, characterId } = payload.data;

  const { data: players, error: pError } = await supabase
    .from("room_players")
    .select("guest_id, secret_character_id, score")
    .eq("room_id", roomId);

  if (pError || !players) throw new Error("Erro ao buscar jogadores da sala");

  const opponent = players.find((p) => p.guest_id !== guestId);
  const me = players.find((p) => p.guest_id === guestId);

  if (!opponent || !me) throw new Error("Adversário ou jogador não encontrado");

  const isCorrect = opponent.secret_character_id === characterId;
  const winnerId = isCorrect ? guestId : opponent.guest_id;
  const winner = players.find((p) => p.guest_id === winnerId);
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
      ...(newScore >= 3 ? { match_winner_id: winnerId as any } : {})
    })
    .eq("id", roomId);

  return { isCorrect, winnerId, opponentSecretId: opponent.secret_character_id ?? null };
};

export const abandonMatch = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;

  const { data: players } = await supabase
    .from("room_players")
    .select("guest_id")
    .eq("room_id", roomId);

  const opponent = players?.find((p) => p.guest_id !== guestId);
  const winnerId = opponent?.guest_id || guestId;

  await supabase
    .from("rooms")
    .update({
      winner_id: winnerId as any,
      match_winner_id: winnerId as any,
      status: "FINISHED",
      last_action_timestamp: new Date().toISOString()
    })
    .eq("id", roomId);

  return { success: true };
};

export const declareWinner = async (payload: { data: { roomId: string; winnerId: string } }) => {
  const { roomId, winnerId } = payload.data;
  const { data: player, error: playerError } = await supabase
    .from("room_players")
    .select("score, room_id, guest_id")
    .eq("room_id", roomId)
    .eq("guest_id", winnerId)
    .maybeSingle();

  if (playerError || !player) throw new Error("Jogador não encontrado");

  const newScore = (player.score || 0) + 1;

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
      last_action_timestamp: new Date().toISOString()
    })
    .eq("id", roomId);

  if (newScore >= 3) {
    await supabase
      .from("rooms")
      .update({ match_winner_id: winnerId as any })
      .eq("id", roomId);
  }

  return { success: true, newScore };
};

export const requestRematch = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;
  const { error } = await supabase
    .from("rooms")
    .update({ 
      rematch_requested_by: guestId as any,
      rematch_status: 'requested'
    })
    .eq("id", roomId);
  
  if (error) throw error;
  return { success: true };
};

export const handleRematchResponse = async (payload: { data: { roomId: string; guestId: string; accept: boolean } }) => {
  const { roomId, guestId, accept } = payload.data;

  if (accept) {
    const CHAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    for (let i = CHAR_IDS.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j]!, CHAR_IDS[i]!];
    }

    const { data: players } = await supabase
      .from("room_players")
      .select("guest_id")
      .eq("room_id", roomId);

    if (players && players.length >= 2) {
      for (let i = 0; i < players.length; i++) {
        const player = players[i]!;
        const characterId = CHAR_IDS[i]!;
        await supabase
          .from("room_players")
          .update({ secret_character_id: characterId })
          .eq("room_id", roomId)
          .eq("guest_id", player.guest_id);
      }
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("winner_id")
      .eq("id", roomId)
      .single();
    
    const lastWinnerId = room?.winner_id;
    const nextTurnPlayerId = (players && players.length >= 2)
      ? (players.find(p => p.guest_id !== lastWinnerId)?.guest_id || guestId)
      : guestId;

    await supabase
      .from("rooms")
      .update({ 
        status: "PLAYING",
        winner_id: null as any,
        rematch_status: 'idle',
        rematch_requested_by: null as any,
        current_question_id: null as any,
        last_answer: null as any,
        question_asked_by: null as any,
        current_turn_player_id: nextTurnPlayerId,
        last_action_timestamp: new Date().toISOString()
      })
      .eq("id", roomId);
  } else {
    await supabase
      .from("rooms")
      .update({ 
        rematch_status: 'declined',
        rematch_requested_by: null as any
      })
      .eq("id", roomId);
  }

  return { success: true };
};

export const getSecrets = async (payload: { data: { code: string; guestId: string } }) => {
  const { code, guestId } = payload.data;
  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, winner_id, room_players(guest_id, secret_character_id)")
    .eq("code", code)
    .single();

  const players = (room as any)?.room_players || [];
  const me = players.find((p: any) => p.guest_id === guestId);
  const opp = players.find((p: any) => p.guest_id !== guestId);
  const isFinished = room?.status === "FINISHED" || !!room?.winner_id;

  return {
    mySecretId: me?.secret_character_id ?? null,
    opponentSecretId: isFinished ? (opp?.secret_character_id ?? null) : null
  };
};
