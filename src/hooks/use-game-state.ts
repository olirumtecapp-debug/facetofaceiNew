import { useState, useEffect, useCallback, useMemo } from "react";
import { Character, CHARACTERS } from "@/data/characters";
import { Question, QUESTIONS } from "@/data/questions";
import { Difficulty, getAIResponse, getBestAIQuestion, getAIPalpite } from "@/lib/ai-logic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GamePhase = 
  | "PLAYER_TURN"        
  | "WAITING_ANSWER"     
  | "PLAYER_DISCARDING"  
  | "WAITING_PASS_TURN"  
  | "AI_TURN"            
  | "PLAYER_RESPONDING"  
  | "AI_DISCARDING"      
  | "AI_PASS_TURN";      

export type GameMode = "IA" | "ONLINE";

export type GameState = {
  playerColor: "AZUL" | "VERMELHO";
  difficulty: Difficulty;
  playerScore: number;
  aiScore: number;
  playerSecret: Character;
  aiSecret: Character;
  playerBoard: { character: Character; isDown: boolean }[];
  aiRemainingChars: Character[];
  currentTurn: "PLAYER" | "AI";
  phase: GamePhase;
  turnCount: number;
  history: { type: "PLAYER" | "AI"; text: string; answer?: "SIM" | "NÃO" }[];
  isGameOver: boolean;
  winner?: "PLAYER" | "AI" | "WINNER" | "LOSER" | "ABANDONED" | undefined;
  matchWinnerId?: string | null;
  rematchStatus?: 'idle' | 'requested' | 'accepted' | 'declined';
  rematchRequestedBy?: string | null;
  pendingQuestion?: { question: Question; type: "PLAYER" | "AI" | "AI_PALPITE"; revealedAnswer?: "SIM" | "NÃO" } | undefined;
  askedQuestions: Set<string>;
  myAskedQuestions: Set<string>;
  opponentAskedQuestions: Set<string>;
  aiAskedQuestions: Set<string>;
  playerKnowledge: { [questionId: string]: boolean };
  aiKnowledge: { [questionId: string]: boolean };
  gameMode: GameMode;
  roomCode?: string | undefined;
  opponentId?: string | undefined;
  opponentName?: string | undefined;
  playerName?: string | undefined;
  roomId?: string | undefined;
  guestId: string;
  lastActionTime?: number;
};

export const useGameState = (playerColor: "AZUL" | "VERMELHO", difficulty: Difficulty, initialRoomCode?: string) => {
  const guestId = useMemo(() => {
    if (typeof window === 'undefined') return "ssr-id";
    let id = window.localStorage.getItem("ftf_guest_id");
    if (!id) {
      id = window.crypto.randomUUID();
      window.localStorage.setItem("ftf_guest_id", id);
    }
    return id;
  }, []);

  const [gameState, setGameState] = useState<GameState>(() => {
    const isOnline = !!initialRoomCode;
    const playerSecret = isOnline ? CHARACTERS[0]! : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!;
    const aiSecret = isOnline ? CHARACTERS[0]! : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!;
    
    return {
      playerColor,
      difficulty,
      playerScore: 0,
      aiScore: 0,
      playerSecret,
      aiSecret,
      playerBoard: CHARACTERS.map((c) => ({ character: c, isDown: false })),
      aiRemainingChars: [...CHARACTERS],
      currentTurn: "PLAYER",
      phase: "PLAYER_TURN",
      turnCount: 1,
      history: [],
      isGameOver: false,
      askedQuestions: new Set<string>(),
      myAskedQuestions: new Set<string>(),
      opponentAskedQuestions: new Set<string>(),
      aiAskedQuestions: new Set<string>(),
      playerKnowledge: {},
      aiKnowledge: {},
      gameMode: isOnline ? "ONLINE" : "IA",
      roomCode: initialRoomCode || undefined,
      guestId,
      playerName: typeof window !== 'undefined' ? (window.localStorage.getItem("ftf_player_name") || undefined) : undefined,
      lastActionTime: Date.now()
    };
  });

  const nextTurn = useCallback(() => {
    setGameState((prev) => {
      if (prev.isGameOver) return prev;
      const isAITurnEnding = prev.currentTurn === "AI";
      const newTurn = isAITurnEnding ? "PLAYER" : "AI";
      if (prev.gameMode === "ONLINE" && prev.roomCode) {
        const nextPlayerId = isAITurnEnding ? prev.guestId : (prev.opponentId || null);
        supabase.from("rooms").update({ current_turn_player_id: nextPlayerId as any, last_answer: null as any, current_question_id: null as any, question_asked_by: null as any, last_action_timestamp: new Date().toISOString() }).eq("code", prev.roomCode).then();
      }
      return { ...prev, currentTurn: newTurn, phase: isAITurnEnding ? "PLAYER_TURN" : "AI_TURN", turnCount: isAITurnEnding ? prev.turnCount + 1 : prev.turnCount };
    });
  }, []);

  const handlePlayerQuestion = async (question: Question) => {
    const isAlreadyAsked = gameState.gameMode === "ONLINE" ? gameState.myAskedQuestions.has(question.id) : gameState.askedQuestions.has(question.id);
    if (gameState.phase !== "PLAYER_TURN" || gameState.isGameOver || isAlreadyAsked) return;
    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      try {
        const { error } = await supabase.from("rooms").update({ current_question_id: question.id, last_answer: null as any, question_asked_by: gameState.guestId, last_action_timestamp: new Date().toISOString() }).eq("code", gameState.roomCode);
        if (error) { toast.error("Erro ao enviar pergunta."); return; }
        setGameState(prev => ({ ...prev, phase: "WAITING_ANSWER", pendingQuestion: { question, type: "PLAYER" }, lastActionTime: Date.now() }));
      } catch (err) { toast.error("Erro de conexão ao enviar pergunta."); return; }
    } else {
      setGameState((prev) => ({ ...prev, phase: "WAITING_ANSWER", pendingQuestion: { question, type: "PLAYER" }, askedQuestions: new Set(prev.askedQuestions).add(question.id), lastActionTime: Date.now() }));
    }
  };

  const revealAIAnswer = () => {
    if (gameState.gameMode === "ONLINE") return;
    if (!gameState.pendingQuestion || gameState.pendingQuestion.type !== "PLAYER") return;
    const answer = getAIResponse(gameState.aiSecret, gameState.pendingQuestion.question) ? "SIM" : "NÃO";
    setGameState(prev => ({ ...prev, pendingQuestion: prev.pendingQuestion ? { ...prev.pendingQuestion, revealedAnswer: answer } : undefined }));
  };

  const answerQuestion = async (answer: "SIM" | "NÃO") => {
    if (!gameState.pendingQuestion) return;
    const { question, type } = gameState.pendingQuestion;
    if (gameState.gameMode === "ONLINE" && gameState.roomCode && (type === "AI" || type === "AI_PALPITE")) {
      try {
        const { error } = await supabase.from("rooms").update({ last_answer: answer, current_question_id: null as any, question_asked_by: gameState.guestId as any, last_action_timestamp: new Date().toISOString() }).eq("code", gameState.roomCode);
        if (error) { toast.error("Erro ao enviar resposta."); return; }
      } catch (err) { toast.error("Erro de conexão ao enviar resposta."); return; }
    }
    if (type === "PLAYER") {
      setGameState((prev) => ({ ...prev, history: [...prev.history, { type: "PLAYER", text: question.text, answer }], pendingQuestion: undefined, askedQuestions: new Set(prev.askedQuestions).add(question.id), myAskedQuestions: new Set(prev.myAskedQuestions).add(question.id), playerKnowledge: { ...prev.playerKnowledge, [question.id]: answer === "SIM" }, phase: "PLAYER_DISCARDING" }));
    } else if (type === "AI_PALPITE") {
      const guessedCharId = question.id.replace('palpite-', '');
      const isCorrect = Number(guessedCharId) === gameState.playerSecret.id;
      setGameState((prev) => ({ ...prev, isGameOver: true, winner: isCorrect ? "AI" : "PLAYER", aiScore: isCorrect ? prev.aiScore + 1 : prev.aiScore, playerScore: isCorrect ? prev.playerScore : prev.playerScore + 1, history: [...prev.history, { type: "AI", text: `Tentativa de palpite: ${question.text}`, answer }], pendingQuestion: undefined }));
    } else {
      setGameState((prev) => ({ ...prev, history: [...prev.history, { type: "AI", text: question.text, answer }], pendingQuestion: undefined, opponentAskedQuestions: new Set(prev.opponentAskedQuestions).add(question.id), aiAskedQuestions: new Set(prev.aiAskedQuestions).add(question.id), aiKnowledge: { ...prev.aiKnowledge, [question.id]: answer === "SIM" }, phase: "AI_DISCARDING" }));
    }
  };

  const toggleCard = (id: number) => {
    setGameState((prev) => ({ ...prev, playerBoard: prev.playerBoard.map((item) => item.character.id === id ? { ...item, isDown: !item.isDown } : item) }));
  };

  const autoDownCards = (question: Question, answer: "SIM" | "NÃO") => {
    setGameState((prev) => ({ ...prev, playerBoard: prev.playerBoard.map((item) => { const matches = question.check(item.character); if (answer === "SIM" && !matches) return { ...item, isDown: true }; if (answer === "NÃO" && matches) return { ...item, isDown: true }; return item; }) }));
  };

  const playerPalpite = async (character: Character) => {
    const isCorrect = character.id === gameState.aiSecret.id;
    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      try {
        const { declareWinner } = await import("@/lib/online.functions");
        const winnerId = isCorrect ? gameState.guestId : gameState.opponentId!;
        
        // No modo ONLINE, aguardamos a resposta do servidor para ter CERTEZA do placar e status
        // mas setamos o winner local para feedback imediato
        setGameState(prev => ({ 
          ...prev, 
          isGameOver: true, 
          winner: isCorrect ? "WINNER" : "LOSER"
        }));

        await declareWinner({ data: { roomId: gameState.roomId || "", winnerId } });
        
        // Após o declareWinner, o polling ou Realtime vai atualizar o restante (placar, aiSecret)
      } catch (error) { 
        toast.error("Erro ao processar palpite final."); 
        setGameState(prev => ({ ...prev, isGameOver: false })); // Reverter se der erro
      }
      return;
    }
    setGameState((prev) => ({ ...prev, isGameOver: true, winner: isCorrect ? "PLAYER" : "AI", playerScore: isCorrect ? prev.playerScore + 1 : prev.playerScore, aiScore: isCorrect ? prev.aiScore : prev.aiScore + 1 }));
  };

  const passTurn = useCallback(() => {
    if (gameState.currentTurn !== "PLAYER" || gameState.isGameOver) return;
    if (gameState.phase !== "PLAYER_DISCARDING" && gameState.phase !== "PLAYER_TURN") return;
    setGameState((prev) => ({ ...prev, history: [...prev.history, { type: "PLAYER", text: "Passou a vez." }] }));
    setTimeout(nextTurn, 400);
  }, [gameState.currentTurn, gameState.isGameOver, gameState.phase, nextTurn]);

  const rematch = useCallback(() => {
     setGameState((prev) => ({ ...prev, playerSecret: CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!, aiSecret: CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!, playerBoard: CHARACTERS.map((c) => ({ character: c, isDown: false })), aiRemainingChars: [...CHARACTERS], currentTurn: "PLAYER", phase: "PLAYER_TURN", turnCount: 1, history: [], isGameOver: false, winner: undefined, askedQuestions: new Set<string>(), myAskedQuestions: new Set<string>(), opponentAskedQuestions: new Set<string>(), aiAskedQuestions: new Set<string>(), playerKnowledge: {}, aiKnowledge: {}, pendingQuestion: undefined }));
  }, []);

  useEffect(() => {
    if (gameState.gameMode !== "ONLINE" || !gameState.roomCode) return;
    const syncGameState = async (roomData: any) => {
      const winnerId = roomData['winner_id'], status = roomData['status'];
      
      // Se houver um vencedor definido no banco, FORÇAR o estado de Game Over
      if (winnerId || status === "FINISHED") {
        const didIWin = winnerId === gameState.guestId;
        const matchWinnerId = roomData['match_winner_id'];
        
        // Revelar personagens secretos IMEDIATAMENTE ao detectar fim de jogo
        if (gameState.roomId) {
          const { data } = await supabase.from('room_players').select('guest_id, score, secret_character_id').eq('room_id', gameState.roomId);
          if (data) {
            const opponent = data.find(p => p.guest_id !== gameState.guestId);
            const me = data.find(p => p.guest_id === gameState.guestId);
            
            if (opponent && opponent.secret_character_id) {
              const secretChar = CHARACTERS.find(c => c.id === opponent.secret_character_id);
              
              setGameState(prev => ({ 
                ...prev, 
                isGameOver: true, 
                winner: didIWin ? "WINNER" : "LOSER",
                aiSecret: secretChar || prev.aiSecret,
                playerScore: me?.score ?? prev.playerScore,
                aiScore: opponent?.score ?? prev.aiScore,
                matchWinnerId: matchWinnerId || prev.matchWinnerId,
                rematchStatus: roomData['rematch_status'] || prev.rematchStatus,
                rematchRequestedBy: roomData['rematch_requested_by'] || prev.rematchRequestedBy,
                phase: "PLAYER_TURN", 
                pendingQuestion: undefined,
                lastActionTime: Date.now()
              }));
              return; // Estado aplicado, podemos sair
            }
          }
        }
        
        // Fallback caso a query de players demore
        setGameState(prev => ({
          ...prev,
          isGameOver: true,
          winner: didIWin ? "WINNER" : "LOSER",
          matchWinnerId: matchWinnerId || prev.matchWinnerId,
          rematchStatus: roomData['rematch_status'] || prev.rematchStatus,
          rematchRequestedBy: roomData['rematch_requested_by'] || prev.rematchRequestedBy,
          phase: "PLAYER_TURN",
          pendingQuestion: undefined,
          lastActionTime: Date.now()
        }));
      }
      if (roomData['rematch_status'] && status === "FINISHED") setGameState(prev => ({ ...prev, rematchStatus: roomData['rematch_status'], rematchRequestedBy: roomData['rematch_requested_by'] }));
      if (status === "PLAYING" && roomData['current_question_id'] === null && roomData['last_answer'] === null && roomData['winner_id'] === null) {
          setGameState(prev => {
            if (!prev.isGameOver) return prev;
            if (gameState.roomId) {
              supabase.from('room_players').select('guest_id, score, secret_character_id').eq('room_id', gameState.roomId).then(({data}) => {
                if (data) {
                  const me = data.find(p => p.guest_id === gameState.guestId), opponent = data.find(p => p.guest_id !== gameState.guestId);
                  const secretChar = CHARACTERS.find(c => c.id === opponent?.secret_character_id), mySecret = CHARACTERS.find(c => c.id === me?.secret_character_id);
                  setGameState(prevInner => ({ ...prevInner, isGameOver: false, winner: undefined, playerScore: me?.score || 0, aiScore: opponent?.score || 0, playerSecret: mySecret || prevInner.playerSecret, aiSecret: secretChar || prevInner.aiSecret, rematchStatus: 'idle', rematchRequestedBy: null, askedQuestions: new Set(), myAskedQuestions: new Set(), opponentAskedQuestions: new Set(), turnCount: 1, history: [], pendingQuestion: undefined, playerBoard: prevInner.playerBoard.map(b => ({ ...b, isDown: false })), lastActionTime: Date.now() }));
                }
              });
            }
            return prev;
          });
      }
      if (roomData['current_turn_player_id'] && status === "PLAYING") {
        const isMyTurn = roomData['current_turn_player_id'] === gameState.guestId;
        setGameState(prev => {
          // SE O JOGO JÁ ACABOU LOCALMENTE, NÃO ATUALIZAR TURNO OU FASE PARA "PLAYING"
          if (prev.isGameOver) return prev;
          
          let newPhase = prev.phase;
          if (isMyTurn) { if (prev.phase !== "PLAYER_RESPONDING" && prev.phase !== "WAITING_ANSWER" && prev.phase !== "PLAYER_DISCARDING") newPhase = "PLAYER_TURN"; }
          else if (prev.phase !== "PLAYER_RESPONDING") newPhase = "AI_TURN"; 
          return { ...prev, currentTurn: isMyTurn ? "PLAYER" : "AI", phase: newPhase, lastActionTime: Date.now() };
        });
      }
      if (roomData['current_question_id'] && status === "PLAYING") {
        const askerId = roomData['question_asked_by'], isFromOpponent = askerId && askerId !== gameState.guestId;
        const question = QUESTIONS.find(q => q.id === roomData['current_question_id']);
        if (question) {
          if (isFromOpponent) setGameState(prev => { 
            if (prev.isGameOver) return prev; // Bloqueio
            if (prev.pendingQuestion?.question.id === question.id && prev.phase === "PLAYER_RESPONDING") return prev; 
            return { ...prev, phase: "PLAYER_RESPONDING", pendingQuestion: { question, type: "AI" }, lastActionTime: Date.now() }; 
          });
          else setGameState(prev => { 
            if (prev.isGameOver) return prev; // Bloqueio
            if (prev.pendingQuestion?.question.id === question.id && prev.phase === "WAITING_ANSWER") return prev; 
            return { ...prev, phase: "WAITING_ANSWER", pendingQuestion: { question, type: "PLAYER" }, lastActionTime: Date.now() }; 
          });
        }
      }
      if (roomData['last_answer'] && !roomData['current_question_id']) {
        const answer = roomData['last_answer'] as "SIM" | "NÃO", askerId = roomData['question_asked_by'];
        if (askerId && askerId !== gameState.guestId) {
          setGameState(prev => {
            if (prev.pendingQuestion && prev.pendingQuestion.type === "PLAYER" && !prev.pendingQuestion.revealedAnswer) return { ...prev, pendingQuestion: { ...prev.pendingQuestion, revealedAnswer: answer }, myAskedQuestions: new Set(prev.myAskedQuestions).add(prev.pendingQuestion.question.id), lastActionTime: Date.now() };
            return prev;
          });
        }
      }
    };
    const pollInterval = setInterval(async () => {
      if (!gameState.roomCode) return;
      const { data: room, error } = await supabase.from("rooms").select("*").eq("code", gameState.roomCode).single();
      if (error) {
        console.error("Polling error:", error);
        return;
      }
      if (room) {
        if (room.status === "ABANDONED") setGameState(prev => { if (prev.winner === "ABANDONED") return prev; toast.error("Ops, parece que alguém desistiu da luta 👻"); return { ...prev, isGameOver: true, winner: "ABANDONED" }; });
        else syncGameState(room);
      }
    }, 2000);
    const channel = supabase.channel(`room_${gameState.roomCode}_${gameState.guestId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${gameState.roomCode}` }, (payload) => {
        if (gameState.gameMode !== "ONLINE") return;
        const newRoomData = payload.new as any;
        if (newRoomData.status === "ABANDONED") { setGameState(prev => ({ ...prev, isGameOver: true, winner: "ABANDONED", lastActionTime: Date.now() })); toast.error("Ops, parece que alguém desistiu da luta 👻"); return; }
        syncGameState(newRoomData);
        const oldRoomData = payload.old as any;
        if (newRoomData['rematch_status'] === 'requested' && oldRoomData?.rematch_status !== 'requested' && newRoomData['rematch_requested_by'] !== gameState.guestId) toast.info("REVANCHE SOLICITADA!");
        else if (newRoomData['rematch_status'] === 'declined' && oldRoomData?.rematch_status !== 'declined') toast.info("Ah, desistiu? Campeão precisa descansar mesmo 😏");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_players", filter: `room_id=eq.${gameState.roomId}` }, (payload) => {
        const updatedPlayer = payload.new as any;
        setGameState(prev => {
          const char = CHARACTERS.find(c => c.id === updatedPlayer.secret_character_id);
          if (updatedPlayer.guest_id === gameState.guestId) return { ...prev, playerScore: updatedPlayer.score, playerSecret: char || prev.playerSecret };
          else return { ...prev, aiScore: updatedPlayer.score, aiSecret: char || prev.aiSecret };
        });
      })
      .subscribe();
    return () => { clearInterval(pollInterval); supabase.removeChannel(channel); };
  }, [gameState.gameMode, gameState.roomCode, gameState.roomId, gameState.guestId]);

  useEffect(() => {
    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      const syncRoom = async () => {
        const { data: roomData, error } = await supabase.from("rooms").select("*, room_players(*)").eq("code", gameState.roomCode!).single();
        if (error || !roomData) return;
        const players = roomData.room_players || [], opponent = players.find((p: any) => p.guest_id !== gameState.guestId), me = players.find((p: any) => p.guest_id === gameState.guestId), isMyTurn = roomData.current_turn_player_id === gameState.guestId;
        let mySecret = gameState.playerSecret, oppSecret = gameState.aiSecret;
        if (me?.secret_character_id) { const char = CHARACTERS.find(c => c.id === me.secret_character_id); if (char) mySecret = char; }
        if (opponent?.secret_character_id) { const char = CHARACTERS.find(c => c.id === opponent.secret_character_id); if (char) oppSecret = char; }
        setGameState(prev => {
          let newPhase: GamePhase = isMyTurn ? "PLAYER_TURN" : "AI_TURN", pendingQuestion = undefined;
          if (roomData.current_question_id) {
            const question = QUESTIONS.find(q => q.id === roomData.current_question_id);
            if (question) { if (roomData.question_asked_by === gameState.guestId) { newPhase = "WAITING_ANSWER"; pendingQuestion = { question, type: "PLAYER" as const }; } else { newPhase = "PLAYER_RESPONDING"; pendingQuestion = { question, type: "AI" as const }; } }
          } else if (roomData.last_answer && roomData.question_asked_by !== gameState.guestId) newPhase = "WAITING_ANSWER";
          return { ...prev, playerSecret: mySecret, aiSecret: oppSecret, opponentId: opponent?.guest_id, opponentName: opponent?.name || undefined, playerName: me?.name || prev.playerName, roomId: roomData.id, playerScore: me?.score || 0, aiScore: opponent?.score || 0, currentTurn: isMyTurn ? "PLAYER" : "AI", phase: newPhase, pendingQuestion, lastActionTime: Date.now() };
        });
      };
      syncRoom();
    }
  }, [gameState.roomCode, gameState.guestId]);

  useEffect(() => {
    if (gameState.isGameOver || gameState.gameMode === "ONLINE") return undefined;
    if (gameState.phase === "AI_TURN" && !gameState.pendingQuestion) {
      const timer = setTimeout(() => {
        const palpite = getAIPalpite(gameState.difficulty, gameState.aiRemainingChars);
        if (palpite) setGameState((prev) => ({ ...prev, phase: "PLAYER_RESPONDING", pendingQuestion: { question: { id: `palpite-${palpite.id}`, text: `Seu personagem é ${palpite.nome}?`, category: "Palpite", check: (c) => c.id === palpite.id }, type: "AI_PALPITE" } }));
        else {
          const question = getBestAIQuestion(gameState.difficulty, gameState.aiRemainingChars, gameState.turnCount, gameState.aiAskedQuestions, gameState.aiKnowledge);
          if (question) setGameState((prev) => ({ ...prev, phase: "PLAYER_RESPONDING", pendingQuestion: { question, type: "AI" }, aiAskedQuestions: new Set(prev.aiAskedQuestions).add(question.id) }));
          else nextTurn();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gameState.phase, gameState.isGameOver, gameState.gameMode, gameState.difficulty, gameState.aiRemainingChars, gameState.aiAskedQuestions, gameState.aiKnowledge, gameState.pendingQuestion, gameState.turnCount, nextTurn]);

  return { gameState, handlePlayerQuestion, answerQuestion, toggleCard, autoDownCards, playerPalpite, passTurn, rematch, revealAIAnswer, guestId };
};
