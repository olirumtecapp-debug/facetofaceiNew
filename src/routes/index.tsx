import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import logoAsset from "@/assets/logo.png.asset.json";
import playIaAsset from "@/assets/play-ia.png.asset.json";
import playOnlineAsset from "@/assets/play-online.png.asset.json";
import { Difficulty } from "@/lib/ai-logic";
import { GameBoard } from "@/components/GameBoard";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [screen, setScreen] = useState<"MENU" | "CHOOSE_COLOR" | "CHOOSE_DIFFICULTY" | "GAME">("MENU");
  const [playerColor, setPlayerColor] = useState<"AZUL" | "VERMELHO">("AZUL");
  const [difficulty, setDifficulty] = useState<Difficulty>("Médio");

  if (screen === "GAME") {
    return <GameBoard playerColor={playerColor} difficulty={difficulty} onBack={() => setScreen("MENU")} />;
  }

  if (screen === "CHOOSE_DIFFICULTY") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-4 text-white">
        <div className="flex w-full max-w-md flex-col gap-6 text-center">
          <h2 className="text-3xl font-black italic text-yellow-400 uppercase">Dificuldade da IA</h2>
          <div className="grid gap-4">
             {(["Fácil", "Médio", "Difícil"] as Difficulty[]).map(d => (
               <button 
                 key={d}
                 onClick={() => { setDifficulty(d); setScreen("CHOOSE_COLOR"); }}
                 className="rounded-xl border border-white/10 bg-gray-800 p-6 text-xl font-bold transition-all hover:scale-105 hover:bg-gray-700"
               >
                 {d}
               </button>
             ))}
          </div>
          <button onClick={() => setScreen("MENU")} className="mt-4 text-gray-400 hover:text-white font-bold">VOLTAR</button>
        </div>
      </div>
    );
  }

  if (screen === "CHOOSE_COLOR") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-4 text-white">
        <div className="flex w-full max-w-2xl flex-col gap-12 text-center">
          <h2 className="text-4xl font-black italic text-yellow-400 uppercase">Escolha sua cor</h2>
          
          <div className="flex flex-col gap-8 md:flex-row">
            <button 
              onClick={() => { setPlayerColor("AZUL"); setScreen("GAME"); }}
              className="group flex-1 rounded-2xl border-4 border-[#1e62ec] bg-[#1e62ec]/10 p-12 transition-all hover:scale-105 hover:bg-[#1e62ec]/20"
            >
              <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-[#1e62ec] shadow-[0_0_30px_rgba(30,98,236,0.5)]" />
              <h3 className="text-3xl font-black text-[#1e62ec]">AZUL</h3>
            </button>
            
            <button 
              onClick={() => { setPlayerColor("VERMELHO"); setScreen("GAME"); }}
              className="group flex-1 rounded-2xl border-4 border-[#e52e2e] bg-[#e52e2e]/10 p-12 transition-all hover:scale-105 hover:bg-[#e52e2e]/20"
            >
              <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-[#e52e2e] shadow-[0_0_30px_rgba(229,46,46,0.5)]" />
              <h3 className="text-3xl font-black text-[#e52e2e]">VERMELHO</h3>
            </button>
          </div>
          
          <button onClick={() => setScreen("CHOOSE_DIFFICULTY")} className="text-gray-400 hover:text-white font-bold uppercase tracking-widest">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-4 text-white">
      <div className="flex w-full max-w-4xl flex-col items-center gap-16">
        <img 
          src={logoAsset.url} 
          alt="FTF - FACE TO FACE" 
          className="h-56 object-contain drop-shadow-[0_0_30px_rgba(30,98,236,0.3)] mix-blend-screen" 
        />
        
        <div className="flex w-full flex-col justify-center items-center gap-10 md:flex-row">
          <button 
            onClick={() => setScreen("CHOOSE_DIFFICULTY")}
            className="group relative transition-transform hover:scale-110 active:scale-95"
          >
            <img 
              src={playIaAsset.url} 
              alt="JOGAR VS IA" 
              className="h-64 w-64 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]" 
            />
          </button>
          
          <button 
            onClick={() => alert("Multiplayer em breve!")}
            className="group relative transition-transform hover:scale-110 active:scale-95"
          >
            <img 
              src={playOnlineAsset.url} 
              alt="JOGAR ON-LINE" 
              className="h-64 w-64 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]" 
            />
          </button>
        </div>

        <div className="flex w-full justify-between px-4 opacity-60">
           <button className="text-2xl hover:scale-110 transition-transform">⚙️</button>
           <button className="rounded-full bg-gray-800 px-6 py-2 text-sm font-bold hover:bg-gray-700 transition-colors">👤 PERSONAGENS</button>
           <button className="text-2xl hover:scale-110 transition-transform">💗</button>
        </div>
      </div>
    </div>
  );
}