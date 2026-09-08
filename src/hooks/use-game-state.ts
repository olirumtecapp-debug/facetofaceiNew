import { useState, useEffect, useCallback, useMemo } from "react";
import { Character, CHARACTERS } from "@/data/characters";
import { Question, QUESTIONS } from "@/data/questions";
import { Difficulty, getAIResponse, getBestAIQuestion, getAIPalpite } from "@/lib/ai-logic";
import { toast } from "sonner";

export type GamePhase = 
  | "PLAYER_TURN"        // Jogador pode perguntar
  | "WAITING_ANSWER"     // Aguarda apenas a resposta SIM ou NÃO
  | "PLAYER_DISCARDING"  // Jogador está descartando personagens
  | "WAITING_PASS_TURN"  // Aguarda o clique em "Passar a vez"
  | "AI_TURN"            // A IA faz apenas UMA pergunta
  | "PLAYER_RESPONDING"  // Jogador responde
  | "AI_DISCARDING"      // IA descarta seus personagens
  | "AI_PASS_TURN";      // IA encerra seu turno

export type GameMode = "IA" | "ONLINE" | "LOADING";

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
  winner?: "PLAYER" | "AI" | "WINNER" | "LOSER" | undefined;
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
    if (typeof window === 'undefined') return 'server';
    let id = sessionStorage.getItem("ftf_guest_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("ftf_guest_id", id);
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
      playerName: typeof window !== 'undefined' ? (localStorage.getItem("ftf_player_name") || undefined) : undefined,
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
        
        console.log("[FTF TURN] changing to:", nextPlayerId === prev.guestId ? "EU" : "ADVERSÁRIO");

        const code = prev.roomCode;
        const myId = prev.guestId;
        import("@/lib/online.functions").then(({ setTurn }) =>
          setTurn({ data: { code, guestId: myId, nextPlayerId: nextPlayerId ?? null } })
        ).catch((e) => console.error("[FTF TURN] error", e));
      }

      return {
        ...prev,
        currentTurn: newTurn,
        phase: isAITurnEnding ? "PLAYER_TURN" : "AI_TURN",
        turnCount: isAITurnEnding ? prev.turnCount + 1 : prev.turnCount,
        pendingQuestion: undefined,
      };
    });
  }, []);

  const handlePlayerQuestion = async (question: Question) => {
    const isAlreadyAsked = gameState.gameMode === "ONLINE" 
      ? gameState.myAskedQuestions.has(question.id)
      : gameState.askedQuestions.has(question.id);

    if (gameState.phase !== "PLAYER_TURN" || gameState.isGameOver || isAlreadyAsked) return;

    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      try {
        console.log("Multiplayer: Enviando pergunta para a sala", gameState.roomCode);
        
        // 1. Update local state immediately for responsiveness
        setGameState(prev => ({
          ...prev,
          phase: "WAITING_ANSWER",
          pendingQuestion: { question, type: "PLAYER" },
          lastActionTime: Date.now()
        }));

        // 2. Synchronize with server
        const { sendQuestion } = await import("@/lib/online.functions");
        const error = await sendQuestion({
          data: { code: gameState.roomCode, guestId: gameState.guestId, questionId: question.id }
        }).then(() => null).catch((e) => e);
        
        if (error) {
          console.error("Multiplayer Error:", error);
          toast.error("Erro ao enviar pergunta.");
          return;
        }

        // Local state already updated above
      } catch (err) {
        console.error("Multiplayer Catch Error:", err);
        toast.error("Erro de conexão ao enviar pergunta.");
        return;
      }
    } else if (gameState.gameMode === "IA") {
      setGameState((prev) => ({
        ...prev,
        phase: "WAITING_ANSWER",
        pendingQuestion: { question, type: "PLAYER" },
        askedQuestions: new Set(prev.askedQuestions).add(question.id),
        lastActionTime: Date.now()
      }));
    }
  };

  const revealAIAnswer = () => {
    if (gameState.gameMode === "ONLINE") return;
    if (!gameState.pendingQuestion || gameState.pendingQuestion.type !== "PLAYER") return;
    const answer = getAIResponse(gameState.aiSecret, gameState.pendingQuestion.question) ? "SIM" : "NÃO";
    setGameState(prev => ({
      ...prev,
      pendingQuestion: prev.pendingQuestion ? { ...prev.pendingQuestion, revealedAnswer: answer } : undefined
    }));
  };

  const answerQuestion = async (answer: "SIM" | "NÃO") => {
    if (!gameState.pendingQuestion) return;

    const { question, type } = gameState.pendingQuestion;

    if (gameState.gameMode === "ONLINE" && gameState.roomCode && (type === "AI" || type === "AI_PALPITE")) {
      try {
        console.log("[FTF ANSWER] sending:", answer);
        
        // 1. Update local state immediately
        if (type === "AI" || type === "AI_PALPITE") {
          setGameState(prev => ({
            ...prev,
            history: [...prev.history, { 
              type: type === "AI" ? "AI" : "AI", 
              text: type === "AI_PALPITE" ? `Tentativa de palpite: ${question.text}` : question.text, 
              answer 
            }],
            pendingQuestion: undefined,
            phase: type === "AI_PALPITE" ? prev.phase : "AI_DISCARDING", // Winner logic will handle game over
            lastActionTime: Date.now()
          }));
        }

        // 2. Send to server
        const { sendAnswer } = await import("@/lib/online.functions");
        const error = await sendAnswer({
          data: { code: gameState.roomCode, guestId: gameState.guestId, answer }
        }).then(() => null).catch((e) => e);
        
        if (error) {
          toast.error("Erro ao enviar resposta.");
          return;
        }
      } catch (err) {
        toast.error("Erro de conexão ao enviar resposta.");
        return;
      }
    }

    if (type === "PLAYER") {
      setGameState((prev) => {
        const newMyAskedQuestions = new Set(prev.myAskedQuestions).add(question.id);
        console.log("[FTF DEBUG] Player question answered. New count:", newMyAskedQuestions.size);
        return {
          ...prev,
          history: [...prev.history, { type: "PLAYER", text: question.text, answer }],
          pendingQuestion: undefined,
          askedQuestions: new Set(prev.askedQuestions).add(question.id),
          myAskedQuestions: newMyAskedQuestions,
          playerKnowledge: { ...prev.playerKnowledge, [question.id]: answer === "SIM" },
          phase: "PLAYER_DISCARDING"
        };
      });
    } else if (type === "AI_PALPITE") {
      const guessedCharId = question.id.replace('palpite-', '');
      const isCorrect = Number(guessedCharId) === gameState.playerSecret.id;
      
      setGameState((prev) => ({
        ...prev,
        isGameOver: true,
        winner: isCorrect ? "AI" : "PLAYER",
        aiScore: isCorrect ? prev.aiScore + 1 : prev.aiScore,
        playerScore: isCorrect ? prev.playerScore : prev.playerScore + 1,
        history: [...prev.history, { type: "AI", text: `Tentativa de palpite: ${question.text}`, answer }],
        pendingQuestion: undefined,
      }));
    } else {
      setGameState((prev) => ({
        ...prev,
        history: [...prev.history, { type: "AI", text: question.text, answer }],
        pendingQuestion: undefined,
        opponentAskedQuestions: new Set(prev.opponentAskedQuestions).add(question.id),
        aiAskedQuestions: new Set(prev.aiAskedQuestions).add(question.id),
        aiKnowledge: { ...prev.aiKnowledge, [question.id]: answer === "SIM" },
        phase: "AI_DISCARDING"
      }));
    }
  };

  const toggleCard = (id: number) => {
    setGameState((prev) => ({
      ...prev,
      playerBoard: prev.playerBoard.map((item) =>
        item.character.id === id ? { ...item, isDown: !item.isDown } : item
      ),
    }));
  };

  const autoDownCards = (question: Question, answer: "SIM" | "NÃO") => {
    setGameState((prev) => ({
      ...prev,
      playerBoard: prev.playerBoard.map((item) => {
        const matches = question.check(item.character);
        if (answer === "SIM" && !matches) return { ...item, isDown: true };
        if (answer === "NÃO" && matches) return { ...item, isDown: true };
        return item;
      }),
    }));
  };

  const playerPalpite = async (character: Character) => {
    let isCorrect = character.id === gameState.aiSecret.id;

    if (gameState.gameMode === "ONLINE") {
      if (!gameState.roomId) {
        console.error("[FTF PALPITE] Room ID missing during palpite");
        toast.error("Sala não sincronizada. Tente novamente.");
        return;
      }
      let guessResult: { isCorrect: boolean; opponentSecretId: number | null };
      try {
        const { submitGuess } = await import("@/lib/online.functions");
        guessResult = await submitGuess({
          data: { roomId: gameState.roomId, guestId: gameState.guestId, characterId: character.id }
        });
      } catch (e: any) {
        console.error("FINAL_ROUND_ERROR_FULL", { message: e?.message, stack: e?.stack });
        toast.error("Erro ao registrar o fim da rodada. Tente novamente.");
        return;
      }

      isCorrect = guessResult.isCorrect;
      const revealedOpponent = CHARACTERS.find(c => c.id === guessResult.opponentSecretId);

      setGameState(prev => ({
        ...prev,
        isGameOver: true,
        winner: isCorrect ? "WINNER" : "LOSER",
        playerScore: isCorrect ? prev.playerScore + 1 : prev.playerScore,
        aiScore: isCorrect ? prev.aiScore : prev.aiScore + 1,
        pendingQuestion: undefined,
        rematchStatus: 'idle',
        rematchRequestedBy: null,
        aiSecret: revealedOpponent || prev.aiSecret,
        lastActionTime: Date.now()
      }));

      return; 
    }


    setGameState((prev) => ({
      ...prev,
      isGameOver: true,
      winner: isCorrect ? "PLAYER" : "AI",
      playerScore: isCorrect ? prev.playerScore + 1 : prev.playerScore,
      aiScore: isCorrect ? prev.aiScore : prev.aiScore + 1,
    }));
  };

  const passTurn = () => {
    if (gameState.currentTurn !== "PLAYER" || gameState.isGameOver) return;
    if (gameState.phase !== "PLAYER_DISCARDING" && gameState.phase !== "PLAYER_TURN") return;

    setGameState((prev) => ({
      ...prev,
      history: [...prev.history, { type: "PLAYER", text: "Passou a vez." }],
    }));
    setTimeout(nextTurn, 400);
  };

  const rematch = () => {
    setGameState((prev) => ({
      ...prev,
      playerSecret: CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!,
      aiSecret: CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!,
      playerBoard: CHARACTERS.map((c) => ({ character: c, isDown: false })),
      aiRemainingChars: [...CHARACTERS],
      currentTurn: "PLAYER",
      phase: "PLAYER_TURN",
      turnCount: 1,
      history: [],
      isGameOver: false,
      winner: undefined,
      matchWinnerId: null,
      askedQuestions: new Set<string>(),
      myAskedQuestions: new Set<string>(),
      opponentAskedQuestions: new Set<string>(),
      aiAskedQuestions: new Set<string>(),
      playerKnowledge: {},
      aiKnowledge: {},
      pendingQuestion: undefined,
      rematchStatus: 'idle',
      rematchRequestedBy: null
    }));
  };

  const abandon = async () => {
    if (gameState.gameMode === "ONLINE" && gameState.roomId) {
      try {
        const { abandonMatch: abandonMatchFn } = await import("@/lib/online.functions");
        await abandonMatchFn({ data: { roomId: gameState.roomId, guestId: gameState.guestId } });
      } catch (e) {
        console.error("Erro ao abandonar partida:", e);
      }
    } else {
      setGameState(prev => ({
        ...prev,
        isGameOver: true,
        winner: "LOSER",
        matchWinnerId: "AI"
      }));
    }
  };

  useEffect(() => {
    if (gameState.gameMode !== "ONLINE" || !gameState.roomCode) {
      return;
    }

    let isMounted = true;
    const handleRoomData = (newRoomData: any) => {
      if (!isMounted || gameState.gameMode !== "ONLINE" || !newRoomData) return;
      
      const state = newRoomData.state || {};
      const statusLower = (newRoomData.status || '').toLowerCase();
      const winnerId = newRoomData.winner || newRoomData.winner_id;
      const matchWinnerId = state.matchWinnerId || newRoomData.match_winner_id;

      if (statusLower === "finished" || winnerId) {
        if (winnerId) {
          setGameState(prev => {
            const newWinner = winnerId === gameState.guestId ? "WINNER" : "LOSER";
            return {
              ...prev,
              isGameOver: true,
              winner: newWinner,
              matchWinnerId: matchWinnerId || prev.matchWinnerId,
              rematchStatus: newRoomData['rematch_status'] || prev.rematchStatus,
              rematchRequestedBy: newRoomData['rematch_requested_by'] || prev.rematchRequestedBy,
              phase: "PLAYER_TURN",
              pendingQuestion: undefined,
              lastActionTime: Date.now()
            };
          });
        }
      }

      if (newRoomData['rematch_status'] && newRoomData['status'] === "FINISHED") {
        setGameState(prev => ({
          ...prev,
          rematchStatus: newRoomData['rematch_status'],
          rematchRequestedBy: newRoomData['rematch_requested_by']
        }));
      }

      const isHost = playerColor === "AZUL";
      const mySecretId = isHost ? state.hostSecretId : state.guestSecretId;
      const oppSecretId = (statusLower === 'finished' || winnerId) ? (isHost ? state.guestSecretId : state.hostSecretId) : null;
      const myCard = CHARACTERS.find(c => c.id === mySecretId);
      const oppCard = CHARACTERS.find(c => c.id === oppSecretId);

      if (myCard) {
        setGameState(prev => ({
          ...prev,
          playerSecret: myCard,
          aiSecret: oppCard || prev.aiSecret,
          opponentId: isHost ? newRoomData.guest_id : newRoomData.host_id,
          opponentName: (isHost ? newRoomData.guest_name : newRoomData.host_name) || prev.opponentName,
          playerScore: (isHost ? state.hostScore : state.guestScore) || 0,
          aiScore: (isHost ? state.guestScore : state.hostScore) || 0,
        }));
      }

      if (statusLower === "playing") {
        setGameState(prev => {
          if (!prev.isGameOver && prev.rematchStatus !== 'accepted' && prev.playerSecret?.id === mySecretId) return prev;
          return {
            ...prev,
            playerSecret: myCard || prev.playerSecret,
            aiSecret: oppCard || prev.aiSecret,
            isGameOver: false,
            winner: undefined,
            matchWinnerId: null,
            rematchStatus: 'idle',
            rematchRequestedBy: null,
            askedQuestions: new Set(),
            myAskedQuestions: new Set(),
            opponentAskedQuestions: new Set(),
            turnCount: 1,
            history: [],
            pendingQuestion: undefined,
            playerBoard: prev.playerBoard.map(b => ({ ...b, isDown: false })),
            lastActionTime: Date.now()
          };
        });
      }

      const turnPlayerId = newRoomData.turn || state.currentTurnPlayerId;
      if (turnPlayerId && gameState.gameMode === "ONLINE") {
        const isMyTurn = isHost ? (turnPlayerId === newRoomData.host_id) : (turnPlayerId === newRoomData.guest_id);
        setGameState(prev => {
          if (prev.isGameOver) return prev;
          let newPhase = prev.phase;
          if (isMyTurn) {
            if (prev.phase !== "PLAYER_RESPONDING" && prev.phase !== "WAITING_ANSWER" && prev.phase !== "PLAYER_DISCARDING") {
              newPhase = "PLAYER_TURN";
            }
          } else {
            if (prev.phase !== "PLAYER_RESPONDING" && prev.phase !== "WAITING_ANSWER") {
              newPhase = "AI_TURN"; 
            }
          }

          return {
            ...prev,
            currentTurn: isMyTurn ? "PLAYER" : "AI",
            phase: newPhase,
            lastActionTime: Date.now()
          };
        });
      }

      const qId = state.currentQuestionId || newRoomData.current_question_id;
      if (qId) {
        const askerId = state.questionAskedBy || newRoomData.question_asked_by;
        const isFromOpponent = isHost ? (askerId === newRoomData.guest_id) : (askerId === newRoomData.host_id);
        const question = QUESTIONS.find(q => q.id === qId);
        
        if (question) {
          if (isFromOpponent) {
            setGameState(prev => {
              if (prev.pendingQuestion?.question.id === question.id && prev.phase === "PLAYER_RESPONDING") {
                return prev;
              }
              return {
                ...prev,
                phase: "PLAYER_RESPONDING",
                pendingQuestion: { question, type: "AI" },
                lastActionTime: Date.now()
              };
            });
          } else {
            setGameState(prev => {
              if (prev.pendingQuestion?.question.id === question.id && prev.phase === "WAITING_ANSWER") return prev;
              return {
                ...prev,
                phase: "WAITING_ANSWER",
                pendingQuestion: { question, type: "PLAYER" },
                lastActionTime: Date.now()
              };
            });
          }
        }
      }

      const lastAns = state.lastAnswer || newRoomData.last_answer;
      if (lastAns && !qId) {
        const answer = lastAns as "SIM" | "NÃO";
        const askerId = state.questionAskedBy || newRoomData.question_asked_by;
        const isMyQuestion = isHost ? (askerId === newRoomData.host_id) : (askerId === newRoomData.guest_id);

        if (isMyQuestion) {
          setGameState(prev => {
            if (prev.pendingQuestion && prev.pendingQuestion.type === "PLAYER" && !prev.pendingQuestion.revealedAnswer) {
              const newMyAskedQuestions = new Set(prev.myAskedQuestions).add(prev.pendingQuestion.question.id);
              return {
                ...prev,
                pendingQuestion: { ...prev.pendingQuestion, revealedAnswer: answer },
                myAskedQuestions: newMyAskedQuestions,
                lastActionTime: Date.now()
              };
            }
            return prev;
          });
        }
      }

      if (!newRoomData['current_question_id'] && !newRoomData['last_answer'] && newRoomData['status'] === "PLAYING") {
        setGameState(prev => {
          if (prev.phase === "WAITING_ANSWER" || prev.phase === "PLAYER_RESPONDING") {
            return { ...prev, pendingQuestion: undefined };
          }
          return prev;
        });
      }
    };

    // 1. Realtime listener
    const unsubscribe = subscribeToRoom(gameState.roomCode, handleRoomData);

    // 2. High-speed REST polling fallback every 400ms
    const interval = setInterval(async () => {
      try {
        const latest = await getRoom(gameState.roomCode);
        if (latest) handleRoomData(latest);
      } catch (e) {}
    }, 400);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [gameState.gameMode, gameState.roomCode, gameState.roomId, gameState.guestId, playerColor]);

  useEffect(() => {
    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      const syncRoom = async () => {
        try {
          const roomRef = doc(db, "facetoface_rooms", gameState.roomCode!);
          const snap = await getDoc(roomRef);
          if (!snap.exists()) {
            console.error("[FTF SYNC] Room not found in Firestore:", gameState.roomCode);
            return;
          }

          const roomData = snap.data() as any;
          const state = roomData.state || {};
          const isHost = roomData.host_id === gameState.guestId;
          const currentTurnId = roomData.turn || state.currentTurnPlayerId || roomData.host_id;
          const isMyTurn = currentTurnId === gameState.guestId;
          const currentQuestionId = state.currentQuestionId;
          const lastAnswer = state.lastAnswer;
          const askerId = state.questionAskedBy;

          const mySecretId = isHost ? state.hostSecretId : state.guestSecretId;
          const isFinished = roomData.status?.toLowerCase() === "finished" || !!roomData.winner;
          const oppSecretId = isFinished ? (isHost ? state.guestSecretId : state.hostSecretId) : null;

          const myCard = CHARACTERS.find(c => c.id === mySecretId);
          const oppCard = CHARACTERS.find(c => c.id === oppSecretId);

          console.log("[FTF SYNC] Synced room with Firestore:", {
            isHost,
            mySecretId,
            myCard: myCard?.nome,
            isMyTurn,
            turn: currentTurnId
          });
          
          setGameState(prev => {
            let newPhase: GamePhase = isMyTurn ? "PLAYER_TURN" : "AI_TURN";
            let pendingQuestion = undefined;
            const winnerId = roomData.winner;
            const isGameOver = isFinished;

            if (isGameOver && winnerId) {
              newPhase = "PLAYER_TURN";
            } else if (currentQuestionId) {
              const question = QUESTIONS.find(q => q.id === currentQuestionId);
              if (question) {
                if (askerId === gameState.guestId) {
                  newPhase = "WAITING_ANSWER";
                  pendingQuestion = { question, type: "PLAYER" as const };
                } else {
                  newPhase = "PLAYER_RESPONDING";
                  pendingQuestion = { question, type: "AI" as const };
                }
              }
            } else if (lastAnswer && askerId !== gameState.guestId) {
              newPhase = "WAITING_ANSWER";
            }

            return {
              ...prev,
              playerSecret: myCard || prev.playerSecret,
              aiSecret: oppCard || prev.aiSecret,
              playerColor: isHost ? "AZUL" : "VERMELHO",
              opponentId: isHost ? roomData.guest_id : roomData.host_id,
              opponentName: (isHost ? roomData.guest_name : roomData.host_name) || prev.opponentName,
              playerName: (isHost ? roomData.host_name : roomData.guest_name) || prev.playerName,
              roomId: roomData.id,
              playerScore: (isHost ? state.hostScore : state.guestScore) || 0,
              aiScore: (isHost ? state.guestScore : state.hostScore) || 0,
              currentTurn: isMyTurn ? "PLAYER" : "AI",
              phase: newPhase,
              pendingQuestion,
              isGameOver,
              winner: winnerId ? (winnerId === gameState.guestId ? "WINNER" : "LOSER") : prev.winner,
              matchWinnerId: state.matchWinnerId || null,
              rematchStatus: (state.rematchStatus || prev.rematchStatus) as any,
              rematchRequestedBy: state.rematchRequestedBy ?? prev.rematchRequestedBy ?? null,
              lastActionTime: Date.now()
            } as GameState;
          });
        } catch (err) {
          console.error("[FTF SYNC] Error fetching initial room:", err);
        }
      };

      syncRoom();
    }
  }, [gameState.roomCode, gameState.guestId]);

  useEffect(() => {
    if (gameState.isGameOver || gameState.gameMode === "ONLINE") return undefined;

    if (gameState.phase === "AI_TURN" && !gameState.pendingQuestion) {
      const timer = setTimeout(() => {
        const palpite = getAIPalpite(gameState.difficulty, gameState.aiRemainingChars);
        if (palpite) {
          setGameState((prev) => ({
            ...prev,
            phase: "PLAYER_RESPONDING",
            pendingQuestion: { 
              question: { 
                id: `palpite-${palpite.id}`, 
                text: `Seu personagem é ${palpite.nome}?`, 
                category: "Palpite",
                check: (c) => c.id === palpite.id 
              }, 
              type: "AI_PALPITE" 
            }
          }));
        } else {
          const question = getBestAIQuestion(
            gameState.difficulty, 
            gameState.aiRemainingChars, 
            gameState.turnCount,
            gameState.aiAskedQuestions,
            gameState.aiKnowledge
          );
          setGameState((prev) => ({
            ...prev,
            phase: "PLAYER_RESPONDING",
            pendingQuestion: { question, type: "AI" }
          }));
        }
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === "AI_DISCARDING") {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, phase: "AI_PASS_TURN" }));
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === "AI_PASS_TURN") {
      const timer = setTimeout(() => {
        nextTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [gameState.phase, gameState.isGameOver, gameState.pendingQuestion, gameState.difficulty, gameState.aiRemainingChars, gameState.turnCount, nextTurn, gameState.gameMode]);

  return { gameState, handlePlayerQuestion, toggleCard, autoDownCards, playerPalpite, passTurn, rematch, answerQuestion, revealAIAnswer, guestId, abandon };
};
