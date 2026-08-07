import { useState, useEffect, useCallback } from "react";
import { Character, CHARACTERS } from "@/data/characters";
import { Question, QUESTIONS } from "@/data/questions";
import { Difficulty, getAIResponse, getBestAIQuestion, getAIPalpite } from "@/lib/ai-logic";

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
  turnCount: number;
  history: { type: "PLAYER" | "AI"; text: string; answer?: "SIM" | "NÃO" }[];
  isGameOver: boolean;
  winner?: "PLAYER" | "AI" | undefined;
  pendingQuestion?: { question: Question; type: "PLAYER" | "AI" | "AI_PALPITE"; revealedAnswer?: "SIM" | "NÃO" } | undefined;
  askedQuestions: Set<string>;
};

export const useGameState = (playerColor: "AZUL" | "VERMELHO", difficulty: Difficulty) => {
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
      turnCount: 1,
      history: [],
      isGameOver: false,
      askedQuestions: new Set<string>(),
    };
  });

  const nextTurn = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      currentTurn: prev.currentTurn === "PLAYER" ? "AI" : "PLAYER",
      turnCount: prev.currentTurn === "AI" ? prev.turnCount + 1 : prev.turnCount,
    }));
  }, []);

  const handlePlayerQuestion = (question: Question) => {
    if (gameState.currentTurn !== "PLAYER" || gameState.isGameOver || gameState.askedQuestions.has(question.id)) return;

    setGameState((prev) => ({
      ...prev,
      pendingQuestion: { question, type: "PLAYER" },
    }));
  };

  const revealAIAnswer = () => {
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

    if (type === "PLAYER") {
      setGameState((prev) => ({
        ...prev,
        history: [...prev.history, { type: "PLAYER", text: question.text, answer }],
        pendingQuestion: undefined,
        askedQuestions: new Set(prev.askedQuestions).add(question.id),
      }));
      setTimeout(nextTurn, 600);
    } else if (type === "AI_PALPITE") {
      const isCorrect = answer === "SIM";
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
      setGameState((prev) => {
        const newRemaining = prev.aiRemainingChars.filter((c) => {
          const matches = question.check(c);
          return answer === "SIM" ? matches : !matches;
        });
        return {
          ...prev,
          aiRemainingChars: newRemaining,
          history: [...prev.history, { type: "AI", text: question.text, answer }],
          pendingQuestion: undefined,
          askedQuestions: new Set(prev.askedQuestions).add(question.id),
        };
      });
      setTimeout(nextTurn, 600);
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
    if (gameState.currentTurn !== "PLAYER" || gameState.isGameOver) return;
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
      turnCount: 1,
      history: [],
      isGameOver: false,
      winner: undefined,
      askedQuestions: new Set<string>(),
    }));
  };


  useEffect(() => {
    if (gameState.currentTurn === "AI" && !gameState.isGameOver) {
      const timer = setTimeout(() => {
        const palpite = getAIPalpite(gameState.difficulty, gameState.aiRemainingChars);
        if (palpite) {
          // IA faz a pergunta de palpite em vez de ganhar automaticamente
          setGameState((prev) => ({
            ...prev,
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
          const question = getBestAIQuestion(gameState.difficulty, gameState.aiRemainingChars, gameState.turnCount);
          
          setGameState((prev) => ({
            ...prev,
            pendingQuestion: { question, type: "AI" }
          }));
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gameState.currentTurn, gameState.isGameOver, gameState.difficulty, gameState.playerSecret, gameState.turnCount, nextTurn, gameState.aiRemainingChars]);

  return { gameState, handlePlayerQuestion, toggleCard, autoDownCards, playerPalpite, passTurn, rematch, answerQuestion, revealAIAnswer };
};
