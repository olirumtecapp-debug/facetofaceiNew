import { useState, useEffect, useCallback, useMemo } from "react";
import { Character, CHARACTERS } from "@/data/characters";
import { Question, QUESTIONS } from "@/data/questions";
import { Difficulty, getAIResponse, getBestAIQuestion, getAIPalpite } from "@/lib/ai-logic";
import { supabase } from "@/integrations/supabase/client";
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
    let id = localStorage.getItem("ftf_guest_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ftf_guest_id", id);
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
      playerName: localStorage.getItem("ftf_player_name") || undefined,
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

        supabase
          .from("rooms")
          .update({ 
            current_turn_player_id: nextPlayerId as any,
            last_answer: null as any,
            current_question_id: null as any,
            question_asked_by: null as any,
            last_action_timestamp: new Date().toISOString()
          })
          .eq("code", prev.roomCode)
          .then();
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
        const { error } = await supabase
          .from("rooms")
          .update({ 
            current_question_id: question.id,
            last_answer: null as any,
            question_asked_by: gameState.guestId,
            last_action_timestamp: new Date().toISOString()
          })
          .eq("code", gameState.roomCode);
        
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
        const { error } = await supabase
          .from("rooms")
          .update({ 
            last_answer: answer,
            current_question_id: null as any,
            question_asked_by: gameState.guestId as any,
            last_action_timestamp: new Date().toISOString()
          })
          .eq("code", gameState.roomCode);
        
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
      setGameState((prev) => ({
        ...prev,
        history: [...prev.history, { type: "PLAYER", text: question.text, answer }],
        pendingQuestion: undefined,
        askedQuestions: new Set(prev.askedQuestions).add(question.id),
        myAskedQuestions: new Set(prev.myAskedQuestions).add(question.id),
        playerKnowledge: { ...prev.playerKnowledge, [question.id]: answer === "SIM" },
        phase: "PLAYER_DISCARDING"
      }));
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
    const isCorrect = character.id === gameState.aiSecret.id;

    if (gameState.gameMode === "ONLINE") {
      if (!gameState.roomId) {
        console.error("[FTF PALPITE] Room ID missing during palpite");
        toast.error("Sala não sincronizada. Tente novamente.");
        return;
      }
      const winnerId = isCorrect ? gameState.guestId : gameState.opponentId;
      if (!winnerId) {
        console.error("[FTF PALPITE] Opponent ID missing during palpite", { isCorrect, guestId: gameState.guestId, opponentId: gameState.opponentId });
        toast.error("Adversário não encontrado.");
        return;
      }

      console.log("[FTF PALPITE] Starting online palpite flow", { isCorrect, winnerId });

      // Optimistic local end-of-round
      setGameState(prev => ({
        ...prev,
        isGameOver: true,
        winner: isCorrect ? "WINNER" : "LOSER",
        playerScore: isCorrect ? prev.playerScore + 1 : prev.playerScore,
        aiScore: isCorrect ? prev.aiScore : prev.aiScore + 1,
        pendingQuestion: undefined,
        rematchStatus: 'idle',
        rematchRequestedBy: null,
        lastActionTime: Date.now()
      }));

      try {
        const { declareWinner: declareWinnerFn } = await import("@/lib/online.functions");
        console.log("[FTF PALPITE] Calling declareWinner server function", { roomId: gameState.roomId, winnerId });
        const result = await declareWinnerFn({ data: { roomId: gameState.roomId, winnerId } });
        console.log("[FTF PALPITE] declareWinner result:", result);
      } catch (e) {
        console.error("[FTF PALPITE] Error calling declareWinner:", e);
        toast.error("Erro ao registrar o fim da rodada.");
      }
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
      askedQuestions: new Set<string>(),
      myAskedQuestions: new Set<string>(),
      opponentAskedQuestions: new Set<string>(),
      aiAskedQuestions: new Set<string>(),
      playerKnowledge: {},
      aiKnowledge: {},
      pendingQuestion: undefined
    }));
  };

  useEffect(() => {
    // Realtime only exists for ONLINE rooms. State isolation between modes is
    // guaranteed by the caller remounting this hook (keyed by mode + room code).
    if (gameState.gameMode !== "ONLINE" || !gameState.roomCode) {
      return;
    }


    const channel = supabase
      .channel(`room_${gameState.roomCode}_${gameState.guestId}_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${gameState.roomCode}` },
        (payload) => {
          if (gameState.gameMode !== "ONLINE") return;
          const newRoomData = payload.new as any;
          console.log("[FTF REALTIME] Update received:", newRoomData);
          
          if (newRoomData['status'] === "FINISHED" || newRoomData['winner_id']) {
            const winnerId = newRoomData['winner_id'];
            const matchWinnerId = newRoomData['match_winner_id'];
            
            console.log("[FTF REALTIME] Game over detected.", {
              winnerId,
              myId: gameState.guestId,
              status: newRoomData['status']
            });

            // If we have a winner_id, the game is definitely over
            if (winnerId) {
              setGameState(prev => {
                const newWinner = winnerId === gameState.guestId ? "WINNER" : "LOSER";
                console.log("[FTF REALTIME] Setting winner state to:", newWinner);
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

          if (newRoomData['status'] === "PLAYING") {
            // New round started (server reset the room)
            setGameState(prev => {
              // Trigger reset if it's currently game over OR if the rematch was accepted
              if (!prev.isGameOver && prev.rematchStatus !== 'accepted') return prev;
              
              console.log("[FTF REALTIME] Resetting game for new round");
              return {
                ...prev,
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


          if (newRoomData['current_turn_player_id'] && gameState.gameMode === "ONLINE") {
            const isMyTurn = newRoomData['current_turn_player_id'] === gameState.guestId;
            setGameState(prev => {
              if (prev.isGameOver) return prev;
              let newPhase = prev.phase;
              if (isMyTurn) {
                // Se é minha vez e não estou respondendo nem aguardando resposta, é fase de perguntar
                if (prev.phase !== "PLAYER_RESPONDING" && prev.phase !== "WAITING_ANSWER" && prev.phase !== "PLAYER_DISCARDING") {
                  newPhase = "PLAYER_TURN";
                }
              } else {
                // Se não é minha vez e não estou respondendo (o que seria o caso se recebi uma pergunta), é turno da IA/Oponente
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

          if (newRoomData['current_question_id']) {
            const askerId = newRoomData['question_asked_by'];
          const isFromOpponent = askerId && askerId !== gameState.guestId;
          console.log("[FTF REALTIME] Question detected:", { 
            id: newRoomData['current_question_id'], 
            askerId, 
            isFromOpponent,
            myId: gameState.guestId 
          });
            const question = QUESTIONS.find(q => q.id === newRoomData['current_question_id']);
            
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

          if (newRoomData['last_answer'] && !newRoomData['current_question_id']) {
            const answer = newRoomData['last_answer'] as "SIM" | "NÃO";
            const askerId = newRoomData['question_asked_by'];
            const isMyQuestion = askerId && askerId !== gameState.guestId;

            if (isMyQuestion) {
              setGameState(prev => {
                if (prev.pendingQuestion && prev.pendingQuestion.type === "PLAYER" && !prev.pendingQuestion.revealedAnswer) {
                  return {
                    ...prev,
                    pendingQuestion: { ...prev.pendingQuestion, revealedAnswer: answer },
                    myAskedQuestions: new Set(prev.myAskedQuestions).add(prev.pendingQuestion.question.id),
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
        }
      )
      .on(
        "postgres_changes",
        gameState.roomId
          ? { event: "UPDATE", schema: "public", table: "room_players", filter: `room_id=eq.${gameState.roomId}` }
          : { event: "UPDATE", schema: "public", table: "room_players" },
        (payload) => {
          if (gameState.gameMode !== "ONLINE") return;
          const updatedPlayer = payload.new as any;
          if (gameState.roomId && updatedPlayer.room_id !== gameState.roomId) return;
          console.log("[FTF REALTIME] Player updated:", updatedPlayer.guest_id, "Score:", updatedPlayer.score);
          
          if (updatedPlayer.guest_id === gameState.guestId) {
             setGameState(prev => {
               const char = CHARACTERS.find(c => c.id === updatedPlayer.secret_character_id);
               return { ...prev, playerScore: updatedPlayer.score ?? prev.playerScore, playerSecret: char || prev.playerSecret };
             });
          } else {
             setGameState(prev => {
               const char = CHARACTERS.find(c => c.id === updatedPlayer.secret_character_id);
               return { 
                 ...prev, 
                 aiScore: updatedPlayer.score ?? prev.aiScore, 
                 aiSecret: char || prev.aiSecret,
                 opponentName: updatedPlayer.name || prev.opponentName
               };
             });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameState.gameMode, gameState.roomCode, gameState.roomId, gameState.guestId]);


  useEffect(() => {
    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      const syncRoom = async () => {
        const { data: roomData, error } = await supabase
          .from("rooms")
          .select("*, room_players(*)")
          .eq("code", gameState.roomCode!)
          .single();
        
        if (error || !roomData) return;

        const players = roomData.room_players || [];
        const opponent = players.find((p: any) => p.guest_id !== gameState.guestId);
        const me = players.find((p: any) => p.guest_id === gameState.guestId);

        const isMyTurn = roomData.current_turn_player_id === gameState.guestId;
        const currentQuestionId = roomData.current_question_id;
        const lastAnswer = roomData.last_answer;
        const askerId = roomData.question_asked_by;

        let mySecret = gameState.playerSecret;
        let oppSecret = gameState.aiSecret;

        if (me?.secret_character_id) {
          const char = CHARACTERS.find(c => c.id === me.secret_character_id);
          if (char) mySecret = char;
        }
        if (opponent?.secret_character_id) {
          const char = CHARACTERS.find(c => c.id === opponent.secret_character_id);
          if (char) oppSecret = char;
        }
        
        setGameState(prev => {
          let newPhase: GamePhase = isMyTurn ? "PLAYER_TURN" : "AI_TURN";
          let pendingQuestion = undefined;
          const isGameOver = roomData.status === "FINISHED" || !!roomData.winner_id;

          if (isGameOver) {
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
            playerSecret: mySecret,
            aiSecret: oppSecret,
            opponentId: opponent?.guest_id,
            opponentName: opponent?.name || undefined,
            playerName: me?.name || prev.playerName,
            roomId: roomData.id,
            playerScore: me?.score || 0,
            aiScore: opponent?.score || 0,
            currentTurn: isMyTurn ? "PLAYER" : "AI",
            phase: newPhase,
            pendingQuestion,
            isGameOver,
            winner: roomData.winner_id === gameState.guestId ? "WINNER" : (roomData.winner_id ? "LOSER" : undefined),
            matchWinnerId: roomData.match_winner_id,
            lastActionTime: Date.now()
          };
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

  return { gameState, handlePlayerQuestion, toggleCard, autoDownCards, playerPalpite, passTurn, rematch, answerQuestion, revealAIAnswer, guestId };
};
