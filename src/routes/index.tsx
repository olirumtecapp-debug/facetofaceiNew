import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { OnlineGameMode } from "@/components/OnlineGameMode";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [gameMode, setGameMode] = useState<"menu" | "online">("menu");
  const [playerName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("ftf_player_name") || "";
    return "";
  });
  const [guestId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem("ftf_guest_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("ftf_guest_id", id);
      }
      return id;
    }
    return "";
  });

  if (gameMode === "online") return (
    <OnlineGameMode 
      initialPlayerName={playerName} 
      initialGuestId={guestId} 
      onBack={() => setGameMode("menu")} 
    />
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-6">
      <h1 className="text-5xl font-black italic text-yellow-400 mb-12 drop-shadow-lg">FACE TO FACE</h1>
      
      <div className="w-full max-w-sm space-y-4">
        <button 
          className="w-full bg-[#1e62ec] hover:bg-blue-600 p-6 rounded-2xl font-black uppercase italic tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
          onClick={() => setGameMode("online")}
        >
          JOGAR ONLINE
        </button>
        
        <button 
          className="w-full bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl font-black uppercase italic tracking-widest border border-white/5 transition-all opacity-50 cursor-not-allowed"
          disabled
        >
          JOGAR VS IA (Em breve)
        </button>
      </div>
      
      <p className="mt-12 text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">v2.0 Online Edition</p>
    </div>
  );
}
