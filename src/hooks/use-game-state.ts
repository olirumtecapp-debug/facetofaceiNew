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
        console.log("[FTF ONLINE QUESTION SEND]", {
          gameMode: gameState.gameMode,
          roomId: gameState.roomId,
          playerId: gameState.guestId,
          question: question.text
        });

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

        console.log("[FTF ONLINE QUESTION SAVED]", { questionId: question.id, status: "waiting_answer" });

        setGameState(prev => ({
          ...prev,
          phase: "WAITING_ANSWER",
          pendingQuestion: { question, type: "PLAYER" },
          lastActionTime: Date.now()
        }));
      } catch (err) {
        console.error("Multiplayer Catch Error:", err);
        toast.error("Erro de conexão ao enviar pergunta.");
        return;
      }
    } else {
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
        console.log("[FTF ONLINE ANSWER SEND]", { answer });
        
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
        console.log("[FTF ONLINE ANSWER SAVED]", { answer });
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
    
    console.log("[FTF FINAL GUESS CLICK]", {
      gameMode: gameState.gameMode,
      roomId: gameState.roomId,
      playerId: gameState.guestId,
      opponentId: gameState.opponentId,
      guessedCharacterId: character.id
    });

    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      try {
        const { declareWinner } = await import("@/lib/online.functions");
        const winnerId = isCorrect ? gameState.guestId : gameState.opponentId!;
        
        console.log("[FTF FINAL GUESS SUBMITTING]", {
          roomId: gameState.roomId,
          roundWinnerId: winnerId,
          isCorrect
        });

        // Force local state update to avoid waiting for Realtime latency
        setGameState(prev => ({
          ...prev,
          isGameOver: true,
          winner: isCorrect ? "WINNER" : "LOSER",
          phase: "PLAYER_TURN",
          playerScore: isCorrect ? prev.playerScore + 1 : prev.playerScore,
          aiScore: isCorrect ? prev.aiScore : prev.aiScore + 1,
        }));

        await declareWinner({ 
          data: { 
            roomId: gameState.roomId || "", 
            winnerId 
          } 
        });
        console.log("[FTF FINAL GUESS SERVER RESPONSE SENT]");
      } catch (error) {
        console.error("Erro ao declarar vencedor no palpite final:", error);
        toast.error("Erro ao processar palpite final.");
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

  const passTurn = useCallback(() => {
    if (gameState.currentTurn !== "PLAYER" || gameState.isGameOver) return;
    if (gameState.phase !== "PLAYER_DISCARDING" && gameState.phase !== "PLAYER_TURN") return;

    setGameState((prev) => ({
      ...prev,
      history: [...prev.history, { type: "PLAYER", text: "Passou a vez." }],
    }));
    setTimeout(nextTurn, 400);
  }, [gameState.currentTurn, gameState.isGameOver, gameState.phase, nextTurn]);

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
    if (gameState.gameMode !== "ONLINE" || !gameState.roomCode) {
      return;
    }

    console.log("[FTF REALTIME SUBSCRIBE]", {
      roomCode: gameState.roomCode,
      roomId: gameState.roomId,
      playerId: gameState.guestId
    });

    const channel = supabase
      .channel(`room_${gameState.roomCode}_${gameState.guestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${gameState.roomCode}` },
        (payload) => {
          if (gameState.gameMode !== "ONLINE") return;

          const newRoomData = payload.new as any;
          console.log("[FTF REALTIME EVENT]", {
            eventType: payload.eventType,
            status: newRoomData.status,
            winner_id: newRoomData.winner_id,
            rematch_status: newRoomData.rematch_status
          });
          
          // Handle Round End - AUTHORITATIVE SYNC
          const winnerId = newRoomData['winner_id'];
          const status = newRoomData['status'];

          if (winnerId || status === "FINISHED") {
            const didIWin = winnerId === gameState.guestId;
            const matchWinnerId = newRoomData['match_winner_id'];
            
            console.log("[FTF GAME OVER SYNC]", { didIWin, winnerId, guestId: gameState.guestId });

            setGameState(prev => {
              // Even if already in game over, update to ensure winner/loser status is correct from DB
              return {
                ...prev,
                isGameOver: true,
                winner: didIWin ? "WINNER" : "LOSER",
                matchWinnerId: matchWinnerId || prev.matchWinnerId,
                // Scores are fetched from room_players below to ensure accuracy
                rematchStatus: newRoomData['rematch_status'] || prev.rematchStatus,
                rematchRequestedBy: newRoomData['rematch_requested_by'] || prev.rematchRequestedBy,
                phase: "PLAYER_TURN",
                pendingQuestion: undefined,
                lastActionTime: Date.now()
              };
            });

            // Fetch opponent secret character and latest scores on game over
            if (gameState.roomId) {
              supabase.from('room_players')
                .select('guest_id, score, secret_character_id')
                .eq('room_id', gameState.roomId)
                .then(({data}) => {
                  if (data) {
                    const opponent = data.find(p => p.guest_id !== gameState.guestId);
                    const me = data.find(p => p.guest_id === gameState.guestId);
                    
                    if (opponent && opponent.secret_character_id) {
                      const secretChar = CHARACTERS.find(c => c.id === opponent.secret_character_id);
                      if (secretChar) {
                        setGameState(prev => ({ 
                          ...prev, 
                          aiSecret: secretChar,
                          playerScore: me?.score ?? prev.playerScore,
                          aiScore: opponent?.score ?? prev.aiScore
                        }));
                      }
                    }
                  }
                });
            }
          }

          // Handle Rematch State Changes
          if (newRoomData['rematch_status'] && newRoomData['status'] === "FINISHED") {
            setGameState(prev => ({
              ...prev,
              rematchStatus: newRoomData['rematch_status'],
              rematchRequestedBy: newRoomData['rematch_requested_by']
            }));
          }

          // Handle New Round Start (Reset)
          if (newRoomData['status'] === "PLAYING" && (payload.old as any)?.['status'] === "FINISHED") {
            console.log("[FTF NEW ROUND STARTING]");
            
            // Fetch fresh scores from database to ensure sync
            supabase.from('room_players')
              .select('guest_id, score, secret_character_id')
              .eq('room_id', gameState.roomId!)
              .then(({data}) => {
                if (data) {
                  const me = data.find(p => p.guest_id === gameState.guestId);
                  const opponent = data.find(p => p.guest_id !== gameState.guestId);
                  
                  const secretChar = CHARACTERS.find(c => c.id === opponent?.secret_character_id);
                  const mySecret = CHARACTERS.find(c => c.id === me?.secret_character_id);

                  setGameState(prev => ({
                    ...prev,
                    isGameOver: false,
                    winner: undefined,
                    playerScore: me?.score || 0,
                    aiScore: opponent?.score || 0,
                    playerSecret: mySecret || prev.playerSecret,
                    aiSecret: secretChar || prev.aiSecret,
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
                  }));
                }
              });
          }

          // Handle Turn Changes
          if (newRoomData['current_turn_player_id'] && newRoomData['status'] === "PLAYING") {
            const isMyTurn = newRoomData['current_turn_player_id'] === gameState.guestId;
            setGameState(prev => {
              if (prev.isGameOver) return prev;
              let newPhase = prev.phase;
              if (isMyTurn) {
                if (prev.phase !== "PLAYER_RESPONDING" && prev.phase !== "WAITING_ANSWER" && prev.phase !== "PLAYER_DISCARDING") {
                  newPhase = "PLAYER_TURN";
                }
              } else {
                if (prev.phase !== "PLAYER_RESPONDING") {
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
            const question = QUESTIONS.find(q => q.id === newRoomData['current_question_id']);
            
            if (question) {
              if (isFromOpponent) {
                console.log("[FTF ONLINE QUESTION RECEIVED]", {
                  myPlayerId: gameState.guestId,
                  questionId: question.id,
                  authorId: askerId,
                  status: "waiting_answer"
                });

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
            const isMyQuestionResponse = askerId && askerId !== gameState.guestId;

            if (isMyQuestionResponse) {
              console.log("[FTF ONLINE ANSWER RECEIVED]", { answer });
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
            setGameState(prev => ({ ...prev, pendingQuestion: undefined }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_players", filter: `room_id=eq.${gameState.roomId}` },
        (payload) => {
          const updatedPlayer = payload.new as any;
          if (updatedPlayer.guest_id === gameState.guestId) {
             setGameState(prev => {
               const char = CHARACTERS.find(c => c.id === updatedPlayer.secret_character_id);
               return { ...prev, playerScore: updatedPlayer.score, playerSecret: char || prev.playerSecret };
             });
          } else {
             setGameState(prev => {
               const char = CHARACTERS.find(c => c.id === updatedPlayer.secret_character_id);
               return { ...prev, aiScore: updatedPlayer.score, aiSecret: char || prev.aiSecret };
             });
          }
        }
      )
      .subscribe((status) => {
        console.log("[FTF REALTIME STATUS]", status);
      });

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

          if (currentQuestionId) {
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
            roomId: roomData.id, // Ensure roomId is stored
            playerScore: me?.score || 0,
            aiScore: opponent?.score || 0,
            currentTurn: isMyTurn ? "PLAYER" : "AI",
            phase: newPhase,
            pendingQuestion,
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
