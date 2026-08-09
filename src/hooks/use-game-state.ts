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
  winner?: "PLAYER" | "AI" | undefined;
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
  guestId: string;
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
    // For ONLINE mode, we don't randomize here to avoid mismatches; 
    // we'll wait for the sync effect to fetch the server-assigned secrets.
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
      guestId
    };
  });

  const nextTurn = useCallback(() => {
    setGameState((prev) => {
      if (prev.isGameOver) return prev;
      
      const isAITurnEnding = prev.currentTurn === "AI";
      const newTurn = isAITurnEnding ? "PLAYER" : "AI";
      
      // Sync turn to database if online
      if (prev.gameMode === "ONLINE" && prev.roomCode) {
        // Correct logic: if PLAYER turn ends, set turn to opponent.
        // If opponent (represented as AI in state) turn ends, set turn to PLAYER.
        const nextPlayerId = isAITurnEnding ? prev.guestId : (prev.opponentId || null);
        
        supabase
          .from("rooms")
          .update({ 
            current_turn_player_id: nextPlayerId as any,
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
        const { error } = await supabase
          .from("rooms")
          .update({ 
            current_question_id: question.id,
            last_answer: null as any,
            last_action_timestamp: new Date().toISOString()
          })
          .eq("code", gameState.roomCode);
        
        if (error) {
          toast.error("Erro ao enviar pergunta.");
          return;
        }
      } catch (err) {
        toast.error("Erro de conexão ao enviar pergunta.");
        return;
      }
    }

    setGameState((prev) => ({
      ...prev,
      phase: "WAITING_ANSWER",
      pendingQuestion: { question, type: "PLAYER" },
    }));
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

    if (gameState.gameMode === "ONLINE" && gameState.roomCode && type !== "PLAYER") {
      try {
        const { error } = await supabase
          .from("rooms")
          .update({ 
            last_answer: answer,
            current_question_id: null as any,
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
      // AI or Opponent Question being answered by player
      setGameState((prev) => {
        return {
          ...prev,
          history: [...prev.history, { type: "AI", text: question.text, answer }],
          pendingQuestion: undefined,
          opponentAskedQuestions: new Set(prev.opponentAskedQuestions).add(question.id),
          aiAskedQuestions: new Set(prev.aiAskedQuestions).add(question.id),
          aiKnowledge: { ...prev.aiKnowledge, [question.id]: answer === "SIM" },
          phase: "AI_DISCARDING"
        };
      });
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

  const playerPalpite = (character: Character) => {
    const isCorrect = character.id === gameState.aiSecret.id;
    setGameState((prev) => ({
      ...prev,
      isGameOver: true,
      winner: isCorrect ? "PLAYER" : "AI",
      playerScore: isCorrect ? prev.playerScore + 1 : prev.playerScore,
      aiScore: isCorrect ? prev.aiScore : prev.aiScore + 1,
    }));
  };

  const passTurn = () => {
    // Only allow manual pass during player's discarding phase or if they are just in their turn
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

  // Realtime Sync Effect
  useEffect(() => {
    if (gameState.gameMode !== "ONLINE" || !gameState.roomCode) return;

    const channel = supabase
      .channel(`room:${gameState.roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${gameState.roomCode}` },
        (payload) => {
          const newRoomData = payload.new as any;
          
          // 1. Sync Turn
          if (newRoomData['current_turn_player_id']) {
            const isMyTurn = newRoomData['current_turn_player_id'] === gameState.guestId;
            setGameState(prev => {
              let newPhase = prev.phase;
              if (isMyTurn) {
                // If it's my turn, and I'm not responding to something, I'm in TURN phase.
                // However, if I was WAITING_ANSWER (I sent a question), I should stay there 
                // until I get the answer sync.
                if (prev.phase !== "PLAYER_RESPONDING" && prev.phase !== "WAITING_ANSWER") {
                  newPhase = "PLAYER_TURN";
                }
              } else {
                // If it's NOT my turn, and I'm not responding, it's AI (Opponent) TURN.
                if (prev.phase !== "PLAYER_RESPONDING") {
                  newPhase = "AI_TURN"; 
                }
              }

              return {
                ...prev,
                currentTurn: isMyTurn ? "PLAYER" : "AI",
                phase: newPhase
              };
            });
          }

          // 2. Received Question (Opponent sent a question, so I must respond)
          if (newRoomData['current_question_id'] && newRoomData['current_turn_player_id'] !== gameState.guestId) {
            const question = QUESTIONS.find(q => q.id === newRoomData['current_question_id']);
            // Only set to RESPONDING if we don't already have this question pending 
            // or if we are not already in RESPONDING phase for a different reason.
            if (question && (!gameState.pendingQuestion || gameState.pendingQuestion.question.id !== question.id)) {
              setGameState(prev => ({
                ...prev,
                phase: "PLAYER_RESPONDING",
                pendingQuestion: { question, type: "AI" }
              }));
            }
          }

          // 3. Received Answer (Opponent responded to my question)
          if (newRoomData['last_answer'] && newRoomData['current_turn_player_id'] === gameState.guestId) {
            const answer = newRoomData['last_answer'] as "SIM" | "NÃO";
            
            setGameState(prev => {
              // If we are waiting for an answer and the pending question matches 
              // (or if we don't have a revealed answer yet)
              if (prev.phase === "WAITING_ANSWER" && prev.pendingQuestion && !prev.pendingQuestion.revealedAnswer) {
                const qId = prev.pendingQuestion.question.id;
                return {
                  ...prev,
                  pendingQuestion: { ...prev.pendingQuestion, revealedAnswer: answer },
                  myAskedQuestions: new Set(prev.myAskedQuestions).add(qId)
                };
              }
              return prev;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_players", filter: `room_id=eq.${gameState.roomCode}` },
        () => {
          // Room code filter above might be wrong since filter is usually on id. 
          // We'll rely on the initial effect and maybe add a player change listener if needed.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState.gameMode, gameState.roomCode, gameState.guestId, gameState.pendingQuestion]);

  // Initial Online Sync Effect
  useEffect(() => {
    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      const syncRoom = async () => {
        const { data: rooms } = await supabase.from("rooms").select("id").eq("code", gameState.roomCode!).single();
        if (!rooms) return;

        const { data: players } = await supabase
          .from("room_players")
          .select("guest_id, secret_character_id, name")
          .eq("room_id", rooms.id);
        
        const opponent = players?.find(p => p.guest_id !== gameState.guestId);
        const me = players?.find(p => p.guest_id === gameState.guestId);

        if (opponent) {
          const oppSecret = opponent.secret_character_id ? CHARACTERS.find(c => c.id === opponent.secret_character_id) : undefined;
          setGameState(prev => ({ 
            ...prev, 
            opponentId: opponent.guest_id,
            opponentName: opponent.name || undefined,
            aiSecret: oppSecret || prev.aiSecret 
          }));
        }

        if (me && me.secret_character_id) {
          const mySecret = CHARACTERS.find(c => c.id === me.secret_character_id);
          if (mySecret) {
            setGameState(prev => ({ ...prev, playerSecret: mySecret }));
          }
        }

        // Fetch current room state to determine turn
        const { data: room } = await supabase.from("rooms").select("*").eq("code", gameState.roomCode!).single();
        if (room) {
          const isMyTurn = room['current_turn_player_id'] === gameState.guestId;
          setGameState(prev => {
            return { 
              ...prev, 
              currentTurn: isMyTurn ? "PLAYER" : "AI",
              phase: isMyTurn ? "PLAYER_TURN" : "AI_TURN"
            };
          });
        }
      };
      syncRoom();
    }
  }, [gameState.gameMode, gameState.roomCode, gameState.guestId]);

  // AI Logic Effect
  useEffect(() => {
    if (gameState.isGameOver || gameState.gameMode === "ONLINE") return undefined;

    // Phase: AI_TURN -> IA makes a question
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

    // Phase: AI_DISCARDING -> IA "thinks" then passes turn
    if (gameState.phase === "AI_DISCARDING") {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, phase: "AI_PASS_TURN" }));
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Phase: AI_PASS_TURN -> AI passes the turn back to player
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
