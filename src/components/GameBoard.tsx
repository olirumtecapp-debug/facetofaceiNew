import { useState } from "react";
import { CHARACTERS } from "@/data/characters";
import { QUESTIONS } from "@/data/questions";
import { useGameState } from "@/hooks/use-game-state";
import { GameCard } from "@/components/GameCard";
import { Difficulty } from "@/lib/ai-logic";

interface GameBoardProps {
  playerColor: "AZUL" | "VERMELHO";
  difficulty: Difficulty;
  onBack: () => void;
}

const CATEGORIES = ["Gênero", "Cabelo", "Olhos & Rosto", "Acessórios", "Barba e Bigode", "Pele & Detalhes"];

export const GameBoard = ({ playerColor, difficulty, onBack }: GameBoardProps) => {
  const { gameState, handlePlayerQuestion, toggleCard, playerPalpite, passTurn, rematch } = useGameState(
    playerColor,
    difficulty,
  );
  const [isPalpitando, setIsPalpitando] = useState(false);
  const [cat, setCat] = useState(CATEGORIES[1]!);

  const myTurn = gameState.currentTurn === "PLAYER" && !gameState.isGameOver;
  const oppColor = playerColor === "AZUL" ? "VERMELHO" : "AZUL";

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0d1117] text-white">
      {/* Game Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Rotating Lightning/Energy effect for game screen */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] animate-lightning-spin opacity-10 bg-[radial-gradient(circle_at_center,transparent_30%,#1e62ec_40%,transparent_41%,#e52e2e_50%,transparent_51%)] blur-[100px]" />
        
        {/* Glow Pulses for game screen */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(30,98,236,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(229,46,46,0.15),transparent_50%)] animate-pulse-glow" />
        
        {/* Subtle Grid overlay */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 bg-[#0b0e14]/80 backdrop-blur-md px-3 py-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all hover:bg-white/10 hover:text-yellow-400 active:scale-95"
        >
          {"<"} Voltar
        </button>
        <div className="min-w-0 text-center">
          <div className="text-[11px] font-black uppercase tracking-widest text-yellow-400 sm:text-sm">
            {gameState.isGameOver ? "FIM DE PARTIDA" : myTurn ? "Seu turno de perguntar" : "Aguarde o adversário..."}
          </div>
          <div className="text-[10px] font-bold text-gray-500">
            Rodada {gameState.turnCount} · IA {difficulty}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-sm font-black">
          <span className="text-[#1e62ec]">{gameState.playerScore}</span>
          <span className="text-gray-600">×</span>
          <span className="text-[#e52e2e]">{gameState.aiScore}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 lg:flex-row lg:gap-3 lg:p-3">
        {/* Board */}
        <section className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-2 custom-scrollbar">
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2 lg:gap-3">
            {gameState.playerBoard.map((item) => (
              <GameCard
                key={item.character.id}
                character={item.character}
                isDown={item.isDown}
                color={playerColor}
                onClick={() => toggleCard(item.character.id)}
              />
            ))}
          </div>
        </section>

        {/* Side panel */}
        <aside className="flex min-h-0 shrink-0 flex-col gap-2 lg:w-[340px]">
          {/* Secret cards + actions */}
          <div className="flex shrink-0 gap-3 rounded-xl border border-white/10 bg-[#0b0e14] p-2">
            <div className="w-16 shrink-0 sm:w-20">
              <div className="mb-1 text-center text-[8px] font-black uppercase tracking-tight text-gray-500">
                Sua carta
              </div>
              <GameCard character={gameState.playerSecret} isDown={false} color={playerColor} onClick={() => {}} />
            </div>
            <div className="w-16 shrink-0 sm:w-20">
              <div className="mb-1 text-center text-[8px] font-black uppercase tracking-tight text-gray-500">
                Adversário
              </div>
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border-2 border-dashed border-white/15 bg-black/40 text-2xl">
                ❓
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <button
                onClick={() => setIsPalpitando(true)}
                disabled={!myTurn}
                className="rounded-lg bg-[#e52e2e] px-2 py-2 text-[11px] font-black uppercase tracking-wide border border-white/20 transition-all hover:bg-red-700 hover:shadow-[0_0_10px_rgba(229,46,46,0.4)] active:scale-95 disabled:opacity-40"
              >
                Palpite final
              </button>
              <button
                onClick={passTurn}
                disabled={!myTurn}
                className="rounded-lg bg-gray-700 px-2 py-2 text-[11px] font-black uppercase tracking-wide border border-white/20 transition-all hover:bg-gray-600 active:scale-95 disabled:opacity-40"
              >
                Passar a vez
              </button>
            </div>
          </div>

          {/* History */}
          <div className="flex min-h-[110px] flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b0e14]">
            <div className="border-b border-white/10 p-2 text-[10px] font-black uppercase tracking-tight text-gray-500">
              Histórico
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2 text-[11px] custom-scrollbar">
              {gameState.history.length === 0 && (
                <p className="text-center text-[10px] text-gray-600">Faça sua primeira pergunta.</p>
              )}
              {gameState.history.map((h, i) => (
                <div key={i} className={`flex flex-col ${h.type === "PLAYER" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-lg px-2 py-1 ${h.type === "PLAYER" ? "bg-[#1e62ec]/80" : "bg-gray-700/80"}`}
                  >
                    {h.text}
                  </div>
                  {h.answer && (
                    <div
                      className={`mt-0.5 px-1 text-[10px] font-black ${h.answer === "SIM" ? "text-green-400" : "text-red-400"}`}
                    >
                      {h.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="shrink-0 rounded-xl border border-white/10 bg-[#0b0e14] p-2">
            <div className="mb-1.5 flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full px-2 py-1 text-[9px] font-black uppercase transition-colors ${
                    cat === c ? "bg-yellow-400 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto custom-scrollbar">
              {QUESTIONS.filter((q) => q.category === cat).map((q) => (
                <button
                  key={q.id}
                  disabled={!myTurn || (q.minTurn ? gameState.turnCount < q.minTurn : false)}
                  onClick={() => handlePlayerQuestion(q)}
                  className="rounded border border-white/5 bg-gray-800/60 px-2 py-1 text-[10px] font-medium transition-colors hover:bg-gray-700 disabled:opacity-30"
                >
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Palpite modal */}
      {isPalpitando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b0e14] p-4 sm:p-6">
            <h2 className="mb-4 text-center text-2xl font-black italic text-[#e52e2e] sm:text-3xl">
              QUEM É O PERSONAGEM?
            </h2>
            <div className="mb-4 grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 custom-scrollbar">
              {CHARACTERS.map((c) => (
                <GameCard
                  key={c.id}
                  character={c}
                  isDown={false}
                  color={oppColor}
                  onClick={() => {
                    setIsPalpitando(false);
                    playerPalpite(c);
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setIsPalpitando(false)}
              className="w-full rounded-xl bg-gray-800 py-3 font-bold hover:bg-gray-700"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {/* Game over */}
      {gameState.isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
          <div className="text-center">
            <h2
              className={`mb-4 text-4xl font-black italic sm:text-6xl ${gameState.winner === "PLAYER" ? "text-green-500" : "text-[#e52e2e]"}`}
            >
              {gameState.winner === "PLAYER" ? "VOCÊ VENCEU!" : "VOCÊ PERDEU!"}
            </h2>
            <p className="mb-8 text-lg text-gray-300">
              O personagem da IA era <span className="font-bold text-white">{gameState.aiSecret.nome}</span>
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={rematch}
                className="rounded-full bg-yellow-400 px-10 py-4 text-xl font-black text-black transition-transform hover:scale-105"
              >
                REVANCHE
              </button>
              <button
                onClick={onBack}
                className="rounded-full bg-gray-800 px-10 py-4 text-xl font-black transition-transform hover:scale-105"
              >
                MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
