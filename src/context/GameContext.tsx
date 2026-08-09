import React, { createContext, useContext, useState, ReactNode } from "react";
import { Difficulty } from "@/lib/ai-logic";

type Screen = "MENU" | "CHOOSE_DIFFICULTY" | "ONLINE" | "GAME";
type GameMode = "IA" | "ONLINE";

interface GameContextType {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [screen, setScreen] = useState<Screen>("MENU");
  const [difficulty, setDifficulty] = useState<Difficulty>("Médio");
  const [gameMode, setGameMode] = useState<GameMode>("IA");
  const [roomCode, setRoomCode] = useState("");

  return (
    <GameContext.Provider value={{ 
      screen, setScreen, 
      difficulty, setDifficulty, 
      gameMode, setGameMode, 
      roomCode, setRoomCode 
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
