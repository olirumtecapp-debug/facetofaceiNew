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
      guestId,
      lastActionTime: Date.now()
    };
  });

  const nextTurn = useCallback(() => {
    setGameState((prev) => {
      if (prev.isGameOver) return prev;
      
      const isAITurnEnding = prev.currentTurn === "AI";
      const newTurn = isAITurnEnding ? "PLAYER" : "AI";
      
      // Sync turn to database if online
      if (prev.gameMode === "ONLINE" && prev.roomCode) {
        // Se o turno do PLAYER acaba, o turno vai para o adversário (representado como AI no state).
        // Se o turno do adversário (AI no state) acaba, o turno vai para o PLAYER.
        const nextPlayerId = isAITurnEnding ? prev.guestId : (prev.opponentId || null);
        
        console.log("[FTF TURN] changing to:", nextPlayerId === prev.guestId ? "EU" : "ADVERSÁRIO");

        supabase
          .from("rooms")
          .update({ 
            current_turn_player_id: nextPlayerId as any,
            last_answer: null as any,
            current_question_id: null as any, // Garante limpeza total
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
        console.log("Multiplayer: Enviando pergunta para a sala", gameState.roomCode);
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
        console.log("[FTF ANSWER] sending:", answer);
        
        // Obter o ID do oponente do estado atual
        const opponentId = gameState.opponentId || null;

        const { error } = await supabase
          .from("rooms")
          .update({ 
            last_answer: answer,
            current_question_id: null as any,
            question_asked_by: opponentId as any,
            last_action_timestamp: new Date().toISOString()
          })
          .eq("code", gameState.roomCode);
        
        if (error) {
          toast.error("Erro ao enviar resposta.");
          return;
        }

        // A troca de turno será feita manualmente pelo jogador que respondeu ou via passar a vez.
        // No fluxo solicitado pelo usuário: "B clica em um botão -> A recebe resposta -> Turno troca para B"
        // Então, após B responder, o turno DEVE mudar para B.
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
    if (gameState.gameMode !== "ONLINE" || !gameState.roomCode) {
      console.log("[FTF REALTIME] Disabling realtime for mode:", gameState.gameMode);
      return;
    }

    const channel = supabase
      .channel(`room_${gameState.roomCode}_${gameState.guestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${gameState.roomCode}` },
        (payload) => {
          if (gameState.gameMode !== "ONLINE") {
            console.warn("[FTF REALTIME] Received update while not in ONLINE mode. Ignoring.");
            return;
          }
          const newRoomData = payload.new as any;
          
          // 1. Sync Turn
          if (newRoomData['current_turn_player_id']) {
            const isMyTurn = newRoomData['current_turn_player_id'] === gameState.guestId;
            setGameState(prev => {
              let newPhase = prev.phase;
              if (isMyTurn) {
                // Se for minha vez, e eu não estiver aguardando resposta (pergunta enviada) 
                // ou respondendo (pergunta recebida), volto para o estado de perguntar.
                if (prev.phase !== "PLAYER_RESPONDING" && prev.phase !== "WAITING_ANSWER" && prev.phase !== "PLAYER_DISCARDING") {
                  newPhase = "PLAYER_TURN";
                }
                
                // Se eu recebi a resposta e o turno mudou para mim (conclusão do ciclo)
                if (newRoomData['last_answer'] === null && prev.pendingQuestion?.revealedAnswer) {
                   newPhase = "PLAYER_TURN";
                }
              } else {
                // Se não for minha vez, e eu não tiver uma pergunta pendente para responder,
                // estou no turno da "IA" (adversário).
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

          // 2. Received Question (Opponent sent a question, so I must respond)
          // PRIORIDADE: Se current_question_id está presente, devemos estar na fase de resposta ou espera
          if (newRoomData['current_question_id']) {
            const askerId = newRoomData['question_asked_by'];
            const isFromOpponent = askerId && askerId !== gameState.guestId;
            const question = QUESTIONS.find(q => q.id === newRoomData['current_question_id']);
            
            if (question) {
              if (isFromOpponent) {
                console.log("[FTF QUESTION] received from opponent:", question.text);
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
              } else if (askerId === gameState.guestId) {
                // Pergunta enviada por mim: garantir estado de espera
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

          // 3. Received Answer (Opponent responded to my question)
          // Se last_answer existe e current_question_id é nulo, a pergunta foi respondida
          if (newRoomData['last_answer'] && !newRoomData['current_question_id']) {
            const answer = newRoomData['last_answer'] as "SIM" | "NÃO";
            const askerId = newRoomData['question_asked_by'];
            const isMyQuestion = askerId === gameState.guestId;

            if (isMyQuestion) {
              setGameState(prev => {
                if (prev.pendingQuestion && prev.pendingQuestion.type === "PLAYER" && !prev.pendingQuestion.revealedAnswer) {
                  console.log("[FTF ANSWER] received from opponent:", answer);
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

          // 4. Limpeza: Se ambos são nulos, resetar estado de pergunta pendente
          if (!newRoomData['current_question_id'] && !newRoomData['last_answer']) {
            setGameState(prev => {
              if (prev.pendingQuestion) {
                return { ...prev, pendingQuestion: undefined };
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
        console.log("[FTF REALTIME] Syncing room on mount:", gameState.roomCode);
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

        if (me && me.secret_character_id) {
          const char = CHARACTERS.find(c => c.id === me.secret_character_id);
          if (char) mySecret = char;
        }

        if (opponent && opponent.secret_character_id) {
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
          } else if (lastAnswer && askerId === gameState.guestId) {
            // Se eu perguntei e já tem resposta, mas ainda é meu turno, 
            // significa que estou na fase de descarte/aguardando ver a resposta.
            // No entanto, como current_question_id é null, não temos a referência direta aqui
            // a menos que o estado local já tenha. Se for um refresh, o histórico ajudaria.
            // Para simplificar a correção do bug principal, focamos em perguntas pendentes.
          }

          return {
            ...prev,
            playerSecret: mySecret,
            aiSecret: oppSecret,
            opponentId: opponent?.guest_id,
            opponentName: opponent?.name || undefined,
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
