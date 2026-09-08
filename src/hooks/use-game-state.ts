import { useState, useEffect, useCallback, useMemo } from "react";
import { Character, CHARACTERS } from "@/data/characters";
import { Question, QUESTIONS } from "@/data/questions";
import { Difficulty, getAIResponse, getBestAIQuestion, getAIPalpite } from "@/lib/ai-logic";
import { 
  getRoom, 
  subscribeToRoom, 
  sendQuestion, 
  answerQuestion as answerQuestionFn, 
  clearQuestion,
  passTurn as passTurnFn, 
  makeGuess, 
  abandonMatch 
} from "@/lib/online.functions";
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
      id = 'p_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
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
        const code = prev.roomCode;
        const myId = prev.guestId;
        passTurnFn({ data: { code, guestId: myId, nextPlayerId } }).catch((e) => console.error("[FTF TURN] error", e));
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
        setGameState(prev => ({
          ...prev,
          phase: "WAITING_ANSWER",
          pendingQuestion: { question, type: "PLAYER" },
          lastActionTime: Date.now()
        }));

        await sendQuestion({
          data: { code: gameState.roomCode, guestId: gameState.guestId, questionId: question.id }
        });
      } catch (err) {
        console.error("Multiplayer Catch Error:", err);
        toast.error("Erro ao enviar pergunta.");
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
        if (type === "AI" || type === "AI_PALPITE") {
          setGameState(prev => ({
            ...prev,
            history: [...prev.history, { 
              type: "AI", 
              text: type === "AI_PALPITE" ? `Tentativa de palpite: ${question.text}` : question.text, 
              answer 
            }],
            pendingQuestion: undefined,
            phase: type === "AI_PALPITE" ? prev.phase : "AI_DISCARDING",
            lastActionTime: Date.now()
          }));
        }

        await answerQuestionFn({
          data: { code: gameState.roomCode, guestId: gameState.guestId, answer }
        });
      } catch (err) {
        toast.error("Erro ao enviar resposta.");
        return;
      }
    }

    if (type === "PLAYER") {
      // The asking player clicked "ENTENDI, CONTINUAR"
      setGameState((prev) => {
        const newMyAskedQuestions = new Set(prev.myAskedQuestions).add(question.id);
        return {
          ...prev,
          history: [...prev.history, { type: "PLAYER", text: question.text, answer }],
          pendingQuestion: undefined,
          askedQuestions: new Set(prev.askedQuestions).add(question.id),
          myAskedQuestions: newMyAskedQuestions,
          playerKnowledge: { ...prev.playerKnowledge, [question.id]: answer === "SIM" },
          phase: "PLAYER_DISCARDING",
          lastActionTime: Date.now()
        };
      });

      if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
        clearQuestion({ data: { code: gameState.roomCode } }).catch(() => {});
      }
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

    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      try {
        const guessResult = await makeGuess({
          data: { code: gameState.roomCode, guestId: gameState.guestId, characterId: character.id }
        });

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
      } catch (e: any) {
        toast.error("Erro ao registrar o palpite.");
        return;
      }
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
    if (gameState.gameMode === "ONLINE" && gameState.roomCode) {
      try {
        await abandonMatch({ data: { code: gameState.roomCode, guestId: gameState.guestId } });
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
      if (!isMounted || !newRoomData) return;
      
      const state = newRoomData.state || {};
      const statusLower = (newRoomData.status || '').toLowerCase();
      const winnerId = newRoomData.winner || newRoomData.winner_id;
      const matchWinnerId = state.matchWinnerId || newRoomData.match_winner_id;

      const isHost = playerColor === "AZUL";
      const myId = isHost ? newRoomData.host_id : newRoomData.guest_id;
      const turnPlayerId = newRoomData.turn || state.currentTurnPlayerId || newRoomData.host_id;
      const isMyTurn = turnPlayerId === myId;

      const mySecretId = isHost ? state.hostSecretId : state.guestSecretId;
      const oppSecretId = (statusLower === 'finished' || winnerId) ? (isHost ? state.guestSecretId : state.hostSecretId) : null;
      const myCard = CHARACTERS.find(c => c.id === mySecretId);
      const oppCard = CHARACTERS.find(c => c.id === oppSecretId);

      const qId = state.currentQuestionId || newRoomData.current_question_id || null;
      const lastAns = state.lastAnswer || newRoomData.last_answer || null;
      const askerId = state.questionAskedBy || newRoomData.question_asked_by || null;

      setGameState(prev => {
        // 1. GAME OVER CHECK
        if (statusLower === "finished" || winnerId) {
          const newWinner = (winnerId === myId || winnerId === gameState.guestId) ? "WINNER" : "LOSER";
          return {
            ...prev,
            playerSecret: myCard || prev.playerSecret,
            aiSecret: oppCard || prev.aiSecret,
            isGameOver: true,
            winner: newWinner,
            matchWinnerId: matchWinnerId || prev.matchWinnerId,
            rematchStatus: (state.rematchStatus || newRoomData.rematch_status || prev.rematchStatus) as any,
            rematchRequestedBy: state.rematchRequestedBy || newRoomData.rematch_requested_by || prev.rematchRequestedBy,
            phase: "PLAYER_TURN",
            pendingQuestion: undefined,
            lastActionTime: Date.now()
          };
        }

        // 2. ACTIVE ROUND SYNC
        let newPhase: GamePhase = prev.phase;
        let newPendingQuestion = prev.pendingQuestion;

        if (qId) {
          const questionObj = QUESTIONS.find(q => q.id === qId);
          if (questionObj) {
            const iAsked = (askerId === myId || askerId === gameState.guestId);
            if (iAsked) {
              // I asked the question
              if (lastAns) {
                // If I already clicked ENTENDI, CONTINUAR (I am in PLAYER_DISCARDING or registered question)
                if (prev.myAskedQuestions.has(qId) || prev.phase === "PLAYER_DISCARDING") {
                  newPendingQuestion = undefined;
                  newPhase = "PLAYER_DISCARDING";
                } else {
                  newPhase = "WAITING_ANSWER";
                  newPendingQuestion = { question: questionObj, type: "PLAYER", revealedAnswer: lastAns as "SIM" | "NÃO" };
                }
              } else {
                // Waiting for opponent to answer
                newPhase = "WAITING_ANSWER";
                newPendingQuestion = { question: questionObj, type: "PLAYER" };
              }
            } else {
              // Opponent asked the question
              if (lastAns) {
                // I already answered, modal is closed for me
                newPendingQuestion = undefined;
                newPhase = "AI_DISCARDING";
              } else {
                // I must answer SIM or NÃO
                newPhase = "PLAYER_RESPONDING";
                newPendingQuestion = { question: questionObj, type: "AI" };
              }
            }
          }
        } else {
          // No question is active on server
          if (prev.phase === "WAITING_ANSWER" || prev.phase === "PLAYER_RESPONDING") {
            newPendingQuestion = undefined;
            newPhase = isMyTurn ? "PLAYER_TURN" : "AI_TURN";
          } else if (prev.phase === "PLAYER_DISCARDING") {
            // Player is discarding cards locally before passing turn
            newPendingQuestion = undefined;
            newPhase = isMyTurn ? "PLAYER_DISCARDING" : "AI_TURN";
          } else {
            newPendingQuestion = undefined;
            newPhase = isMyTurn ? "PLAYER_TURN" : "AI_TURN";
          }
        }

        return {
          ...prev,
          playerSecret: myCard || prev.playerSecret,
          aiSecret: oppCard || prev.aiSecret,
          opponentId: isHost ? newRoomData.guest_id : newRoomData.host_id,
          opponentName: (isHost ? newRoomData.guest_name : newRoomData.host_name) || prev.opponentName,
          playerName: (isHost ? newRoomData.host_name : newRoomData.guest_name) || prev.playerName,
          roomId: newRoomData.id || newRoomData.code || gameState.roomCode,
          playerScore: (isHost ? state.hostScore : state.guestScore) || 0,
          aiScore: (isHost ? state.guestScore : state.hostScore) || 0,
          currentTurn: isMyTurn ? "PLAYER" : "AI",
          phase: newPhase,
          pendingQuestion: newPendingQuestion,
          isGameOver: false,
          rematchStatus: (state.rematchStatus || newRoomData.rematch_status || 'idle') as any,
          rematchRequestedBy: state.rematchRequestedBy || newRoomData.rematch_requested_by || null,
          lastActionTime: Date.now()
        };
      });
    };

    // Initial fetch
    getRoom(gameState.roomCode).then(data => {
      if (data) handleRoomData(data);
    });

    // 1. Realtime listener
    const unsubscribe = subscribeToRoom(gameState.roomCode, handleRoomData);

    // 2. High-speed REST polling fallback every 400ms
    const interval = setInterval(async () => {
      try {
        const latest = await getRoom(gameState.roomCode!);
        if (latest) handleRoomData(latest);
      } catch (e) {}
    }, 400);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [gameState.gameMode, gameState.roomCode, gameState.guestId, playerColor]);

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
