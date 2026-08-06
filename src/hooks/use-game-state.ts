import { useState, useEffect, useCallback } from "react";
import { Character, CHARACTERS } from "@/data/characters";
import { Question } from "@/data/questions";
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
  winner?: "PLAYER" | "AI";
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
    if (gameState.currentTurn !== "PLAYER" || gameState.isGameOver) return;

    const answer = getAIResponse(gameState.aiSecret, question) ? "SIM" : "NÃO";
    
    setGameState((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        { type: "PLAYER", text: question.text, answer }
      ],
    }));

    setTimeout(nextTurn, 1000);
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

  useEffect(() => {
    if (gameState.currentTurn === "AI" && !gameState.isGameOver) {
      const timer = setTimeout(() => {
        const palpite = getAIPalpite(gameState.difficulty, gameState.aiRemainingChars);
        if (palpite) {
          const isCorrect = palpite.id === gameState.playerSecret.id;
          setGameState((prev) => ({
            ...prev,
            isGameOver: true,
            winner: isCorrect ? "AI" : "PLAYER",
            aiScore: isCorrect ? prev.aiScore + 1 : prev.aiScore,
            playerScore: isCorrect ? prev.playerScore : prev.playerScore + 1,
            history: [...prev.history, { type: "AI", text: `Palpite final: ${palpite.nome}!` }]
          }));
          return;
        }

        const question = getBestAIQuestion(gameState.difficulty, gameState.aiRemainingChars, gameState.turnCount);
        const answer = getAIResponse(gameState.playerSecret, question) ? "SIM" : "NÃO";

        setGameState((prev) => ({
          ...prev,
          aiRemainingChars: prev.aiRemainingChars.filter((c) => {
            const matches = question.check(c);
            return answer === "SIM" ? matches : !matches;
          }),
          history: [...prev.history, { type: "AI", text: question.text, answer }],
        }));

        setTimeout(nextTurn, 1000);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTurn, gameState.isGameOver, gameState.aiRemainingChars, gameState.difficulty, gameState.playerSecret, gameState.turnCount, nextTurn]);

  return { gameState, handlePlayerQuestion, toggleCard, autoDownCards, playerPalpite };
};
