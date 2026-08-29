import { supabase } from "@/integrations/supabase/client";

export const createRoom = async (payload: { data: { guestId: string; playerName: string } }) => {
  const { guestId, playerName } = payload.data;
  const code = `FTF-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({ 
      code, 
      status: "waiting",
      host_id: guestId,
      host_name: playerName,
      host_color: "AZUL",
      ruleset: "facetoface",
      turn: guestId,
      state: {
        hostReady: false,
        guestReady: false,
        hostScore: 0,
        guestScore: 0,
        currentTurnPlayerId: guestId,
        rematchStatus: 'idle'
      }
    })
    .select()
    .single();

  if (roomError) throw roomError;

  return { room, code };
};

export const joinRoom = async (payload: { data: { code: string; guestId: string; playerName: string } }) => {
  const { code, guestId, playerName } = payload.data;

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("code", code)
    .maybeSingle();

  if (roomError || !room) throw new Error("Sala não encontrada");
  if (room.status !== "waiting" && room.guest_id !== guestId && room.host_id !== guestId) {
    throw new Error("Sala já em andamento");
  }

  // If joining as guest
  if (room.host_id !== guestId) {
    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({
        guest_id: guestId,
        guest_name: playerName,
        updated_at: new Date().toISOString()
      })
      .eq("id", room.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return { room: updatedRoom };
  }

  return { room };
};

export const toggleReady = async (payload: { data: { roomId: string; guestId: string; isReady: boolean } }) => {
  const { roomId, guestId, isReady } = payload.data;
  
  const { data: room } = await supabase.from("rooms").select().eq("id", roomId).single();
  if (!room) throw new Error("Sala não encontrada");

  const isHost = room.host_id === guestId;
  const state = room.state || {};
  const updatedState = {
    ...state,
    ...(isHost ? { hostReady: isReady } : { guestReady: isReady })
  };

  const { error } = await supabase
    .from("rooms")
    .update({ state: updatedState, updated_at: new Date().toISOString() })
    .eq("id", roomId);

  if (error) throw error;
  return { success: true };
};

export const startGame = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;

  const { data: room } = await supabase.from("rooms").select().eq("id", roomId).single();
  if (!room) throw new Error("Sala não encontrada");
  if (room.host_id !== guestId) throw new Error("Apenas o anfitrião pode iniciar");

  const state = room.state || {};
  if (!state.hostReady || !state.guestReady) {
    throw new Error("Ambos os jogadores precisam estar prontos");
  }

  const CHAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  for (let i = CHAR_IDS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j]!, CHAR_IDS[i]!];
  }

  const hostSecretId = CHAR_IDS[0]!;
  const guestSecretId = CHAR_IDS[1]!;

  const updatedState = {
    ...state,
    hostSecretId,
    guestSecretId,
    currentQuestionId: null,
    lastAnswer: null,
    questionAskedBy: null,
    currentTurnPlayerId: guestId,
    rematchStatus: 'idle',
    rematchRequestedBy: null,
    matchWinnerId: null
  };

  const { error } = await supabase
    .from("rooms")
    .update({ 
      status: "playing",
      winner: null,
      turn: guestId,
      state: updatedState,
      updated_at: new Date().toISOString()
    })
    .eq("id", roomId);
    
  if (error) throw error;
  return { success: true };
};

export const sendQuestion = async (payload: { data: { code: string; guestId: string; questionId: string } }) => {
  const { code, guestId, questionId } = payload.data;
  const { data: room } = await supabase.from("rooms").select().eq("code", code).single();
  if (!room) throw new Error("Sala não encontrada");

  const state = room.state || {};
  const updatedState = {
    ...state,
    currentQuestionId: questionId,
    lastAnswer: null,
    questionAskedBy: guestId
  };

  const { error } = await supabase
    .from("rooms")
    .update({
      state: updatedState,
      updated_at: new Date().toISOString()
    })
    .eq("code", code);

  if (error) throw error;
  return { success: true };
};

export const sendAnswer = async (payload: { data: { code: string; guestId: string; answer: "SIM" | "NÃO" } }) => {
  const { code, guestId, answer } = payload.data;
  const { data: room } = await supabase.from("rooms").select().eq("code", code).single();
  if (!room) throw new Error("Sala não encontrada");

  const state = room.state || {};
  const updatedState = {
    ...state,
    lastAnswer: answer,
    currentQuestionId: null,
    questionAskedBy: guestId
  };

  const { error } = await supabase
    .from("rooms")
    .update({
      state: updatedState,
      updated_at: new Date().toISOString()
    })
    .eq("code", code);

  if (error) throw error;
  return { success: true };
};

export const setTurn = async (payload: { data: { code: string; guestId: string; nextPlayerId: string | null } }) => {
  const { code, nextPlayerId } = payload.data;
  const { data: room } = await supabase.from("rooms").select().eq("code", code).single();
  if (!room) throw new Error("Sala não encontrada");

  const state = room.state || {};
  const updatedState = {
    ...state,
    currentTurnPlayerId: nextPlayerId,
    lastAnswer: null,
    currentQuestionId: null,
    questionAskedBy: null
  };

  const { error } = await supabase
    .from("rooms")
    .update({
      turn: nextPlayerId,
      state: updatedState,
      updated_at: new Date().toISOString()
    })
    .eq("code", code);

  if (error) throw error;
  return { success: true };
};

export const submitGuess = async (payload: { data: { roomId: string; guestId: string; characterId: number } }) => {
  const { roomId, guestId, characterId } = payload.data;

  const { data: room, error } = await supabase.from("rooms").select().eq("id", roomId).single();
  if (error || !room) throw new Error("Sala não encontrada");

  const isHost = room.host_id === guestId;
  const state = room.state || {};
  const opponentSecretId = isHost ? state.guestSecretId : state.hostSecretId;
  const opponentGuestId = isHost ? room.guest_id : room.host_id;

  const isCorrect = opponentSecretId === characterId;
  const winnerId = isCorrect ? guestId : opponentGuestId;

  const hostScore = (state.hostScore || 0) + (winnerId === room.host_id ? 1 : 0);
  const guestScore = (state.guestScore || 0) + (winnerId === room.guest_id ? 1 : 0);
  const matchWinnerId = (hostScore >= 3) ? room.host_id : ((guestScore >= 3) ? room.guest_id : null);

  const updatedState = {
    ...state,
    hostScore,
    guestScore,
    matchWinnerId
  };

  await supabase
    .from("rooms")
    .update({
      winner: winnerId,
      status: "finished",
      state: updatedState,
      updated_at: new Date().toISOString()
    })
    .eq("id", roomId);

  return { isCorrect, winnerId, opponentSecretId: opponentSecretId ?? null };
};

export const abandonMatch = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;
  const { data: room } = await supabase.from("rooms").select().eq("id", roomId).single();
  if (!room) return { success: true };

  const opponentId = room.host_id === guestId ? room.guest_id : room.host_id;
  const winnerId = opponentId || guestId;

  const state = room.state || {};
  const updatedState = {
    ...state,
    matchWinnerId: winnerId
  };

  await supabase
    .from("rooms")
    .update({
      winner: winnerId,
      status: "finished",
      state: updatedState,
      updated_at: new Date().toISOString()
    })
    .eq("id", roomId);

  return { success: true };
};

export const declareWinner = async (payload: { data: { roomId: string; winnerId: string } }) => {
  const { roomId, winnerId } = payload.data;
  const { data: room } = await supabase.from("rooms").select().eq("id", roomId).single();
  if (!room) throw new Error("Sala não encontrada");

  const state = room.state || {};
  const hostScore = (state.hostScore || 0) + (winnerId === room.host_id ? 1 : 0);
  const guestScore = (state.guestScore || 0) + (winnerId === room.guest_id ? 1 : 0);
  const matchWinnerId = (hostScore >= 3) ? room.host_id : ((guestScore >= 3) ? room.guest_id : null);

  const updatedState = {
    ...state,
    hostScore,
    guestScore,
    matchWinnerId
  };

  await supabase
    .from("rooms")
    .update({ 
      winner: winnerId,
      status: "finished",
      state: updatedState,
      updated_at: new Date().toISOString()
    })
    .eq("id", roomId);

  return { success: true, newScore: winnerId === room.host_id ? hostScore : guestScore };
};

export const requestRematch = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;
  const { data: room } = await supabase.from("rooms").select().eq("id", roomId).single();
  if (!room) throw new Error("Sala não encontrada");

  const state = room.state || {};
  const updatedState = {
    ...state,
    rematchRequestedBy: guestId,
    rematchStatus: 'requested'
  };

  const { error } = await supabase
    .from("rooms")
    .update({ state: updatedState, updated_at: new Date().toISOString() })
    .eq("id", roomId);
  
  if (error) throw error;
  return { success: true };
};

export const handleRematchResponse = async (payload: { data: { roomId: string; guestId: string; accept: boolean } }) => {
  const { roomId, guestId, accept } = payload.data;
  const { data: room } = await supabase.from("rooms").select().eq("id", roomId).single();
  if (!room) throw new Error("Sala não encontrada");

  const state = room.state || {};

  if (accept) {
    const CHAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    for (let i = CHAR_IDS.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j]!, CHAR_IDS[i]!];
    }

    const nextTurnPlayerId = room.winner === room.host_id ? room.guest_id : room.host_id;

    const updatedState = {
      ...state,
      hostSecretId: CHAR_IDS[0]!,
      guestSecretId: CHAR_IDS[1]!,
      currentQuestionId: null,
      lastAnswer: null,
      questionAskedBy: null,
      currentTurnPlayerId: nextTurnPlayerId || guestId,
      rematchStatus: 'idle',
      rematchRequestedBy: null
    };

    await supabase
      .from("rooms")
      .update({ 
        status: "playing",
        winner: null,
        turn: nextTurnPlayerId || guestId,
        state: updatedState,
        updated_at: new Date().toISOString()
      })
      .eq("id", roomId);
  } else {
    const updatedState = {
      ...state,
      rematchStatus: 'declined',
      rematchRequestedBy: null
    };

    await supabase
      .from("rooms")
      .update({ 
        state: updatedState,
        updated_at: new Date().toISOString()
      })
      .eq("id", roomId);
  }

  return { success: true };
};

export const getSecrets = async (payload: { data: { code: string; guestId: string } }) => {
  const { code, guestId } = payload.data;
  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, winner, host_id, guest_id, state")
    .eq("code", code)
    .single();

  if (!room) return { mySecretId: null, opponentSecretId: null };

  const state = room.state || {};
  const isHost = room.host_id === guestId;
  const isFinished = room.status === "finished" || !!room.winner;

  const mySecretId = isHost ? state.hostSecretId : state.guestSecretId;
  const opponentSecretId = isFinished ? (isHost ? state.guestSecretId : state.hostSecretId) : null;

  return {
    mySecretId: mySecretId ?? null,
    opponentSecretId: opponentSecretId ?? null
  };
};
