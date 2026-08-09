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
  aiAskedQuestions: Set<string>;
  playerKnowledge: { [questionId: string]: boolean };
  aiKnowledge: { [questionId: string]: boolean };
  gameMode: GameMode;
  roomCode?: string | undefined;
  opponentId?: string | undefined;
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
    const playerSecret = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!;
    const aiSecret = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!;
    
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
      aiAskedQuestions: new Set<string>(),
      playerKnowledge: {},
      aiKnowledge: {},
      gameMode: initialRoomCode ? "ONLINE" : "IA",
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
        supabase
          .from("rooms")
          .update({ 
            current_turn_player_id: (newTurn === "PLAYER" ? prev.guestId : (prev.opponentId || null)) as any,
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

  const handlePlayerQuestion = (question: Question) => {
    if (gameState.phase !== "PLAYER_TURN" || gameState.isGameOver || gameState.askedQuestions.has(question.id)) return;

    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      supabase
        .from("rooms")
        .update({ 
          current_question_id: question.id,
          last_answer: null as any,
          last_action_timestamp: new Date().toISOString()
        })
        .eq("code", gameState.roomCode)
        .then(({ error }) => {
          if (error) toast.error("Erro ao enviar pergunta.");
        });
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

  const answerQuestion = (answer: "SIM" | "NÃO") => {
    if (!gameState.pendingQuestion) return;

    const { question, type } = gameState.pendingQuestion;

    if (gameState.gameMode === "ONLINE" && gameState.roomCode && type !== "PLAYER") {
      supabase
        .from("rooms")
        .update({ 
          last_answer: answer,
          current_question_id: null as any,
          last_action_timestamp: new Date().toISOString()
        })
        .eq("code", gameState.roomCode)
        .then();
    }

    if (type === "PLAYER") {
      setGameState((prev) => ({
        ...prev,
        history: [...prev.history, { type: "PLAYER", text: question.text, answer }],
        pendingQuestion: undefined,
        askedQuestions: new Set(prev.askedQuestions).add(question.id),
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
          askedQuestions: new Set(prev.askedQuestions).add(question.id),
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
              // If phase is RESPONDING, we stay there until we answer.
              // Only auto-switch phase for the active player.
              let newPhase = prev.phase;
              if (isMyTurn) {
                if (prev.phase !== "PLAYER_RESPONDING" && !prev.pendingQuestion) {
                  newPhase = "PLAYER_TURN";
                }
              } else {
                if (prev.phase !== "PLAYER_RESPONDING" && !prev.pendingQuestion) {
                  newPhase = "AI_TURN"; // Representing opponent's turn
                }
              }

              return {
                ...prev,
                currentTurn: isMyTurn ? "PLAYER" : "AI",
                phase: newPhase
              };
            });
          }

          // 2. Received Question
          if (newRoomData['current_question_id'] && newRoomData['current_turn_player_id'] !== gameState.guestId) {
            const question = QUESTIONS.find(q => q.id === newRoomData['current_question_id']);
            if (question) {
              setGameState(prev => ({
                ...prev,
                phase: "PLAYER_RESPONDING",
                pendingQuestion: { question, type: "AI" }
              }));
            }
          }

          // 3. Received Answer
          if (newRoomData['last_answer'] && newRoomData['current_turn_player_id'] === gameState.guestId && gameState.pendingQuestion) {
            const answer = newRoomData['last_answer'] as "SIM" | "NÃO";
            setGameState(prev => ({
              ...prev,
              pendingQuestion: prev.pendingQuestion ? { ...prev.pendingQuestion, revealedAnswer: answer } : undefined
            }));
          }

          // 4. Room Re-joined/Status Sync
          if (newRoomData['status'] === 'PLAYING' && gameState.isGameOver) {
             // Optional: handle rematch sync
          }
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
          .select("guest_id")
          .eq("room_id", rooms.id);
        
        const opponent = players?.find(p => p.guest_id !== gameState.guestId);
        if (opponent) {
          setGameState(prev => ({ ...prev, opponentId: opponent.guest_id }));
        }

        // Set initial turn if not set (creator is first turn)
        const { data: room } = await supabase.from("rooms").select("*").eq("code", gameState.roomCode!).single();
        if (room && !room['current_turn_player_id']) {
          await supabase.from("rooms").update({ current_turn_player_id: gameState.guestId }).eq("code", gameState.roomCode!);
          setGameState(prev => ({ ...prev, currentTurn: "PLAYER", phase: "PLAYER_TURN" }));
        } else if (room) {
          const isMyTurn = room['current_turn_player_id'] === gameState.guestId;
          setGameState(prev => ({ 
            ...prev, 
            currentTurn: isMyTurn ? "PLAYER" : "AI",
            phase: isMyTurn ? "PLAYER_TURN" : "AI_TURN"
          }));
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
