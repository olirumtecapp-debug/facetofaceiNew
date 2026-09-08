import { db } from "@/integrations/firebase/client";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  Unsubscribe 
} from "firebase/firestore";

const COLLECTION_NAME = "facetoface_rooms";
const PROJECT_ID = "expedicao-brasil";

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('mapValue' in val) {
    const res: any = {};
    const fields = val.mapValue.fields || {};
    for (const k of Object.keys(fields)) {
      res[k] = parseFirestoreValue(fields[k]);
    }
    return res;
  }
  if ('arrayValue' in val) {
    const values = val.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  return val;
}

export function parseFirestoreDoc(docObj: any): any {
  if (!docObj || !docObj.fields) return null;
  const res: any = {};
  for (const k of Object.keys(docObj.fields)) {
    res[k] = parseFirestoreValue(docObj.fields[k]);
  }
  return res;
}

// REST Fetch to bypass ANY browser caching or websocket blocks
export const getRoom = async (roomIdOrCode: string): Promise<any> => {
  const code = roomIdOrCode.trim().toUpperCase();
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION_NAME}/${code}?_t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return parseFirestoreDoc(json);
  } catch (e) {
    try {
      const roomRef = doc(db, COLLECTION_NAME, code);
      const snap = await getDoc(roomRef);
      if (snap.exists()) return snap.data();
    } catch (_) {}
    return null;
  }
};

export const subscribeToRoom = (roomIdOrCode: string, onUpdate: (room: any) => void): Unsubscribe => {
  const code = roomIdOrCode.trim().toUpperCase();
  const roomRef = doc(db, COLLECTION_NAME, code);
  
  // Realtime snapshot listener
  const unsub = onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data());
    }
  }, (err) => {
    console.warn("[FTF Realtime Notice - Polling active]", err?.message);
  });

  return unsub;
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

  const room = await getRoom(normalizedCode);
  if (!room) {
    throw new Error("Sala não encontrada. Verifique o código digitado!");
  }

  if (room.status !== "waiting" && room.guest_id !== guestId && room.host_id !== guestId) {
    throw new Error("Esta partida já foi iniciada!");
  }

  let finalGuestId = guestId;
  if (room.host_id === guestId) {
    finalGuestId = 'guest_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  const updatedData = {
    guest_id: finalGuestId,
    guest_name: playerName || "Jogador 2",
    updated_at: new Date().toISOString()
  };

  const roomRef = doc(db, COLLECTION_NAME, normalizedCode);
  await updateDoc(roomRef, updatedData);

  const fresh = await getRoom(normalizedCode);
  return { room: fresh || { ...room, ...updatedData }, assignedGuestId: finalGuestId };
};

export const toggleReady = async (payload: { data: { roomId: string; guestId?: string; isHost?: boolean; isReady: boolean } }) => {
  const { roomId, guestId, isHost: isHostParam, isReady } = payload.data;
  const code = roomId.trim().toUpperCase();
  const room = await getRoom(code);

  if (!room) throw new Error("Sala não encontrada");

  const isHost = (typeof isHostParam === 'boolean') 
    ? isHostParam 
    : (room.host_id === guestId);

  const state = room.state || {};
  const updatedState = {
    ...state,
    ...(isHost ? { hostReady: isReady } : { guestReady: isReady })
  };

  const roomRef = doc(db, COLLECTION_NAME, code);
  await updateDoc(roomRef, {
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const startGame = async (payload: { data: { roomId: string; guestId?: string; isHost?: boolean } }) => {
  const { roomId } = payload.data;
  const code = roomId.trim().toUpperCase();
  const room = await getRoom(code);

  if (!room) throw new Error("Sala não encontrada");

  // Embaralha e sorteia 2 personagens secretos únicos (1 a 24)
  const CHAR_IDS = Array.from({ length: 24 }, (_, i) => i + 1);
  for (let i = CHAR_IDS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j], CHAR_IDS[i]];
  }

  const hostSecretId = CHAR_IDS[0];
  const guestSecretId = CHAR_IDS[1];

  const state = room.state || {};
  const updatedState = {
    ...state,
    hostSecretId,
    guestSecretId,
    currentQuestionId: null,
    lastAnswer: null,
    questionAskedBy: null,
    answeredBy: null,
    currentTurnPlayerId: room.host_id,
    rematchStatus: "idle",
    rematchRequestedBy: null,
    matchWinnerId: null
  };

  const roomRef = doc(db, COLLECTION_NAME, code);
  await updateDoc(roomRef, {
    status: "playing",
    winner: null,
    turn: room.host_id,
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const sendQuestion = async (payload: { data: { code: string; guestId: string; questionId: string } }) => {
  const { code, guestId, questionId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code.trim().toUpperCase());
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;
  const state = room.state || {};

  const updatedState = {
    ...state,
    currentQuestionId: questionId,
    lastAnswer: null,
    questionAskedBy: guestId,
    answeredBy: null
  };

  await updateDoc(roomRef, {
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const answerQuestion = async (payload: { data: { code: string; guestId: string; answer: "SIM" | "NÃO" } }) => {
  const { code, guestId, answer } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code.trim().toUpperCase());
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;
  const state = room.state || {};

  const updatedState = {
    ...state,
    lastAnswer: answer,
    answeredBy: guestId
  };

  await updateDoc(roomRef, {
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const passTurn = async (payload: { data: { code: string; guestId: string } }) => {
  const { code, guestId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code.trim().toUpperCase());
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;
  const nextPlayerId = room.host_id === guestId ? room.guest_id : room.host_id;
  const state = room.state || {};

  const updatedState = {
    ...state,
    currentQuestionId: null,
    lastAnswer: null,
    questionAskedBy: null,
    answeredBy: null,
    currentTurnPlayerId: nextPlayerId
  };

  await updateDoc(roomRef, {
    turn: nextPlayerId,
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { success: true };
};

export const makeGuess = async (payload: { data: { code: string; guestId: string; characterId: number } }) => {
  const { code, guestId, characterId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code.trim().toUpperCase());
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) throw new Error("Sala não encontrada");
  const room = roomSnap.data() as any;
  const state = room.state || {};

  const isHost = room.host_id === guestId;
  const targetSecretId = isHost ? state.guestSecretId : state.hostSecretId;
  const isCorrect = Number(characterId) === Number(targetSecretId);

  const winnerId = isCorrect 
    ? guestId 
    : (isHost ? room.guest_id : room.host_id);

  const updatedState = {
    ...state,
    matchWinnerId: winnerId,
    hostScore: (state.hostScore || 0) + (winnerId === room.host_id ? 1 : 0),
    guestScore: (state.guestScore || 0) + (winnerId === room.guest_id ? 1 : 0)
  };

  await updateDoc(roomRef, {
    status: "finished",
    winner: winnerId,
    state: updatedState,
    updated_at: new Date().toISOString()
  });

  return { isCorrect, winnerId };
};

export const abandonMatch = async (payload: { data: { code: string; guestId: string } }) => {
  const { code, guestId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code.trim().toUpperCase());
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return;
  const room = roomSnap.data() as any;
  const opponentId = room.host_id === guestId ? room.guest_id : room.host_id;

  await updateDoc(roomRef, {
    status: "finished",
    winner: opponentId,
    'state.matchWinnerId': opponentId,
    updated_at: new Date().toISOString()
  });
};

export const requestRematch = async (payload: { data: { code: string; guestId: string } }) => {
  const { code, guestId } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code.trim().toUpperCase());
  await updateDoc(roomRef, {
    'state.rematchStatus': 'requested',
    'state.rematchRequestedBy': guestId,
    updated_at: new Date().toISOString()
  });
};

export const respondRematch = async (payload: { data: { code: string; guestId: string; accept: boolean } }) => {
  const { code, guestId, accept } = payload.data;
  const roomRef = doc(db, COLLECTION_NAME, code.trim().toUpperCase());
  
  if (!accept) {
    await updateDoc(roomRef, {
      'state.rematchStatus': 'declined',
      updated_at: new Date().toISOString()
    });
    return;
  }

  // Novo round
  const CHAR_IDS = Array.from({ length: 24 }, (_, i) => i + 1);
  for (let i = CHAR_IDS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [CHAR_IDS[i], CHAR_IDS[j]] = [CHAR_IDS[j], CHAR_IDS[i]];
  }

  const hostSecretId = CHAR_IDS[0];
  const guestSecretId = CHAR_IDS[1];

  await updateDoc(roomRef, {
    status: "playing",
    winner: null,
    'state.hostSecretId': hostSecretId,
    'state.guestSecretId': guestSecretId,
    'state.currentQuestionId': null,
    'state.lastAnswer': null,
    'state.questionAskedBy': null,
    'state.answeredBy': null,
    'state.rematchStatus': 'accepted',
    'state.matchWinnerId': null,
    updated_at: new Date().toISOString()
  });
};
