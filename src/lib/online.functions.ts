import { db } from "@/integrations/firebase/client";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs,
  Unsubscribe 
} from "firebase/firestore";

const COLLECTION_NAME = "facetoface_rooms";

export const subscribeToRoom = (roomIdOrCode: string, onUpdate: (room: any) => void): Unsubscribe => {
  const roomRef = doc(db, COLLECTION_NAME, roomIdOrCode);
  return onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data());
    }
  }, (err) => {
    console.error("[FTF Realtime Error]", err);
  });
};

export const createRoom = async (payload: { data: { guestId: string; playerName: string } }) => {
  const { guestId, playerName } = payload.data;
  const code = `FTF-${Math.floor(1000 + Math.random() * 9000)}`;

  const newRoom = {
    id: code,
    code,
    status: "waiting",
    host_id: guestId,
    host_name: playerName || "Jogador 1",
    host_color: "AZUL",
    guest_id: null,
    guest_name: null,
    winner: null,
    ruleset: "facetoface",
    turn: guestId,
    state: {
      hostReady: false,
      guestReady: false,
      hostScore: 0,
      guestScore: 0,
      currentTurnPlayerId: guestId,
      rematchStatus: "idle",
      currentQuestionId: null,
      lastAnswer: null,
      questionAskedBy: null,
      answeredBy: null,
      hostSecretId: null,
      guestSecretId: null,
      matchWinnerId: null
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const roomRef = doc(db, COLLECTION_NAME, code);
  await setDoc(roomRef, newRoom);

  return { room: newRoom, code };
};

export const joinRoom = async (payload: { data: { code: string; guestId: string; playerName: string } }) => {
  let { code, guestId, playerName } = payload.data;
  const normalizedCode = code.trim().toUpperCase();

  const roomRef = doc(db, COLLECTION_NAME, normalizedCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error("Sala não encontrada. Verifique o código digitado!");
  }

  const room = roomSnap.data() as any;

  if (room.status !== "waiting" && room.guest_id !== guestId && room.host_id !== guestId) {
    throw new Error("Esta partida já foi iniciada!");
  }

  // Se o guestId for igual ao hostId (ex: abas do mesmo navegador), gera um guestId exclusivo para o jogador 2
  let finalGuestId = guestId;
  if (room.host_id === guestId) {
    finalGuestId = 'guest_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  const updatedData = {
    guest_id: finalGuestId,
    guest_name: playerName || "Jogador 2",
    updated_at: new Date().toISOString()
  };

  await updateDoc(roomRef, updatedData);
  return { room: { ...room, ...updatedData }, assignedGuestId: finalGuestId };
};

export const toggleReady = async (payload: { data: { roomId: string; guestId: string; isReady: boolean } }) => {
  const { roomId, guestId, isReady } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const isHost = room.host_id === guestId;
  const state = room.state || {};
  const updatedState = {
    ...state,
    ...(isHost ? { hostReady: isReady } : { guestReady: isReady })
  };

  await updateDoc(roomRef, {
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const startGame = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  if (room.host_id !== guestId) throw new Error("Apenas o anfitrião pode iniciar a partida!");

  const state = room.state || {};
  if (!state.hostReady || !state.guestReady) {
    throw new Error("Ambos os jogadores precisam clicar em 'PRONTO'!");
  }

  // Embaralha e sorteia 2 personagens secretos únicos
  const CHAR_IDS = Array.from({ length: 24 }, (_, i) => i + 1);
  for (let i = CHAR_IDS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j], CHAR_IDS[i]];
  }

  const hostSecretId = CHAR_IDS[0];
  const guestSecretId = CHAR_IDS[1];

  const updatedState = {
    ...state,
    hostSecretId,
    guestSecretId,
    currentQuestionId: null,
    lastAnswer: null,
    questionAskedBy: null,
    answeredBy: null,
    currentTurnPlayerId: guestId,
    rematchStatus: "idle",
    rematchRequestedBy: null,
    matchWinnerId: null
  };

  await updateDoc(roomRef, {
    status: "playing",
    winner: null,
    turn: guestId,
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const sendQuestion = async (payload: { data: { code: string; guestId: string; questionId: string } }) => {
  const { code, guestId, questionId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const state = room.state || {};
  const updatedState = {
    ...state,
    currentQuestionId: questionId,
    lastAnswer: null,
    questionAskedBy: guestId
  };

  await updateDoc(roomRef, {
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const sendAnswer = async (payload: { data: { code: string; guestId: string; answer: "SIM" | "NÃO" } }) => {
  const { code, guestId, answer } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const state = room.state || {};
  const updatedState = {
    ...state,
    lastAnswer: answer,
    currentQuestionId: null,
    answeredBy: guestId
  };

  await updateDoc(roomRef, {
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const setTurn = async (payload: { data: { code: string; guestId: string; nextPlayerId: string | null } }) => {
  const { code, nextPlayerId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const state = room.state || {};
  const updatedState = {
    ...state,
    currentTurnPlayerId: nextPlayerId,
    lastAnswer: null,
    currentQuestionId: null,
    questionAskedBy: null,
    answeredBy: null
  };

  await updateDoc(roomRef, {
    turn: nextPlayerId,
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const submitGuess = async (payload: { data: { roomId: string; guestId: string; characterId: number } }) => {
  const { roomId, guestId, characterId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const isHost = room.host_id === guestId;
  const state = room.state || {};
  const opponentSecretId = isHost ? state.guestSecretId : state.hostSecretId;
  const opponentGuestId = isHost ? room.guest_id : room.host_id;

  const isCorrect = opponentSecretId === characterId;
  const winnerId = isCorrect ? guestId : opponentGuestId;

  const hostScore = (state.hostScore || 0) + (winnerId === room.host_id ? 1 : 0);
  const guestScore = (state.guestScore || 0) + (winnerId === room.guest_id ? 1 : 0);
  const matchWinnerId = hostScore >= 3 ? room.host_id : (guestScore >= 3 ? room.guest_id : null);

  const updatedState = {
    ...state,
    hostScore,
    guestScore,
    matchWinnerId
  };

  await updateDoc(roomRef, {
    winner: winnerId,
    status: "finished",
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { isCorrect, winnerId, opponentSecretId: opponentSecretId ?? null };
};

export const abandonMatch = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return { success: true };
  const room = roomSnap.data() as any;

  const opponentId = room.host_id === guestId ? room.guest_id : room.host_id;
  const winnerId = opponentId || guestId;

  const state = room.state || {};
  const updatedState = {
    ...state,
    matchWinnerId: winnerId
  };

  await updateDoc(roomRef, {
    winner: winnerId,
    status: "finished",
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const declareWinner = async (payload: { data: { roomId: string; winnerId: string } }) => {
  const { roomId, winnerId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const state = room.state || {};
  const hostScore = (state.hostScore || 0) + (winnerId === room.host_id ? 1 : 0);
  const guestScore = (state.guestScore || 0) + (winnerId === room.guest_id ? 1 : 0);
  const matchWinnerId = hostScore >= 3 ? room.host_id : (guestScore >= 3 ? room.guest_id : null);

  const updatedState = {
    ...state,
    hostScore,
    guestScore,
    matchWinnerId
  };

  await updateDoc(roomRef, {
    winner: winnerId,
    status: "finished",
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true, newScore: winnerId === room.host_id ? hostScore : guestScore };
};

export const requestRematch = async (payload: { data: { roomId: string; guestId: string } }) => {
  const { roomId, guestId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const state = room.state || {};
  const updatedState = {
    ...state,
    rematchRequestedBy: guestId,
    rematchStatus: "requested"
  };

  await updateDoc(roomRef, {
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const handleRematchResponse = async (payload: { data: { roomId: string; guestId: string; accept: boolean } }) => {
  const { roomId, guestId, accept } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;

  const state = room.state || {};

  if (accept) {
    const CHAR_IDS = Array.from({ length: 24 }, (_, i) => i + 1);
    for (let i = CHAR_IDS.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j], CHAR_IDS[i]];
    }

    const nextTurnPlayerId = room.winner === room.host_id ? room.guest_id : room.host_id;

    const updatedState = {
      ...state,
      hostSecretId: CHAR_IDS[0],
      guestSecretId: CHAR_IDS[1],
      currentQuestionId: null,
      lastAnswer: null,
      questionAskedBy: null,
      answeredBy: null,
      currentTurnPlayerId: nextTurnPlayerId || guestId,
      rematchStatus: "idle",
      rematchRequestedBy: null
    };

    await updateDoc(roomRef, {
      status: "playing",
      winner: null,
      turn: nextTurnPlayerId || guestId,
      state: updatedState,
      updated_at: new Date().toISOString()
    });
  } else {
    const updatedState = {
      ...state,
      rematchStatus: "declined",
      rematchRequestedBy: null
    };

    await updateDoc(roomRef, {
      state: updatedState,
      updated_at: new Date().toISOString()
    });
  }

  return { success: true };
};

export const getSecrets = async (payload: { data: { code: string; guestId: string } }) => {
  const { code, guestId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return { mySecretId: null, opponentSecretId: null };
  const room = roomSnap.data() as any;

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
