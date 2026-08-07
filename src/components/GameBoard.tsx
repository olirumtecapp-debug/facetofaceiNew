import { useState } from "react";
import { Character, CHARACTERS } from "@/data/characters";
import { QUESTIONS } from "@/data/questions";
import { useGameState } from "@/hooks/use-game-state";
import { GameCard } from "@/components/GameCard";
import { Difficulty } from "@/lib/ai-logic";
import logoAsset from "@/assets/logo.png.asset.json";

interface GameBoardProps {
  playerColor: "AZUL" | "VERMELHO";
  difficulty: Difficulty;
  onBack: () => void;
}

export const GameBoard = ({ playerColor, difficulty, onBack }: GameBoardProps) => {
  const { gameState, handlePlayerQuestion, toggleCard, autoDownCards, playerPalpite } = useGameState(playerColor, difficulty);
  const [isPalpitando, setIsPalpitando] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col bg-[#0d1117] text-white overflow-hidden">
      {/* Top Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b0e14] px-4 py-2 sm:py-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm font-bold text-gray-400 hover:text-white">
            MENU
          </button>
          <div className="flex gap-2 text-xl font-bold">
            <span className="text-blue-500">{gameState.playerScore}</span>
            <span>-</span>
            <span className="text-red-500">{gameState.aiScore}</span>
          </div>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <div className={`text-sm font-bold uppercase tracking-widest ${gameState.currentTurn === "PLAYER" ? "text-yellow-400" : "text-gray-400"}`}>
            {gameState.currentTurn === "PLAYER" ? "Seu turno de perguntar" : "Aguarde o adversário..."}
          </div>
        </div>

        <button 
          onClick={() => setIsPalpitando(true)}
          disabled={gameState.currentTurn !== "PLAYER" || gameState.isGameOver}
          className="rounded-full bg-red-600 px-6 py-2 text-sm font-bold transition-all hover:bg-red-700 disabled:opacity-50"
        >
          PALPITE FINAL
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden p-3 gap-4">
        {/* Main Board Area */}
        <div className="flex-[3] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
        </div>

        {/* Side Panel */}
        <div className="flex flex-[1] min-w-[320px] flex-col gap-3">
           {/* Your Card */}
           <div className="rounded-xl border border-white/10 bg-[#0b0e14] p-3">
             <div className="mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">SUA CARTA</div>
             <div className="mx-auto w-20">
               <GameCard 
                 character={gameState.playerSecret} 
                 isDown={false} 
                 color={playerColor} 
                 onClick={() => {}} 
                 isSecret 
               />
             </div>
           </div>

           {/* History / Chat */}
           <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b0e14]">
             <div className="border-b border-white/10 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">HISTÓRICO</div>
             <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar text-[11px]">
               {gameState.history.map((h, i) => (
                 <div key={i} className={`flex flex-col ${h.type === "PLAYER" ? "items-end" : "items-start"}`}>
                   <div className={`max-w-[90%] rounded-lg px-2 py-1 ${h.type === "PLAYER" ? "bg-blue-600/80" : "bg-gray-700/80"}`}>
                     {h.text}
                   </div>
                   {h.answer && (
                     <div className={`mt-0.5 px-1 text-[9px] font-black ${h.answer === "SIM" ? "text-green-400" : "text-red-400"}`}>
                       {h.answer}
                     </div>
                   )}
                 </div>
               ))}
             </div>

             {/* Question Selector */}
             {gameState.currentTurn === "PLAYER" && !gameState.isGameOver && !isPalpitando && (
               <div className="border-t border-white/10 bg-black/20 p-3">
                 <div className="mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">SUA VEZ DE PERGUNTAR</div>
                 <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                    {["Gênero", "Cabelo", "Olhos & Rosto", "Acessórios", "Barba e Bigode", "Pele & Detalhes"].map(cat => (
                      <div key={cat}>
                        <div className="mb-1 text-[9px] font-bold text-gray-600 uppercase">{cat}</div>
                        <div className="flex flex-wrap gap-1">
                          {QUESTIONS.filter(q => q.category === cat).map(q => (
                             <button
                               key={q.id}
                               disabled={q.minTurn ? gameState.turnCount < q.minTurn : false}
                               onClick={() => handlePlayerQuestion(q)}
                               className="rounded bg-gray-800/50 px-2 py-1 text-[9px] font-medium transition-colors hover:bg-gray-700 disabled:opacity-30 border border-white/5"
                             >
                               {q.text}
                             </button>
                          ))}
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Overlays */}
      {isPalpitando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0b0e14] p-8 shadow-2xl">
            <h2 className="mb-6 text-center text-3xl font-black italic text-red-600">QUEM É O PERSONAGEM?</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto mb-6">
              {CHARACTERS.map(c => (
                <div 
                  key={c.id} 
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => {
                    playerPalpite(c);
                    setIsPalpitando(false);
                  }}
                >
                   <GameCard character={c} isDown={false} color={playerColor} onClick={() => {}} />
                </div>
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

      {gameState.isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
           <div className="text-center">
             <h2 className={`text-6xl font-black italic mb-4 ${gameState.winner === "PLAYER" ? "text-green-500" : "text-red-500"}`}>
               {gameState.winner === "PLAYER" ? "VOCÊ VENCEU!" : "VOCÊ PERDEU!"}
             </h2>
             <p className="mb-8 text-xl text-gray-300">
               O personagem era <span className="font-bold text-white">{gameState.aiSecret.nome}</span>
             </p>
             <button 
               onClick={onBack}
               className="rounded-full bg-yellow-500 px-12 py-4 text-2xl font-black text-black transition-transform hover:scale-110"
             >
               JOGAR NOVAMENTE
             </button>
           </div>
        </div>
      )}
    </div>
  );
};
