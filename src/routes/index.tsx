import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import homeAsset from "@/assets/home-interface.png.asset.json";
import { CARD_IMAGES } from "@/assets/chars";
import { CHARACTERS } from "@/data/characters";
import { CHARACTER_DETAILS } from "@/data/character-details";
import { Difficulty } from "@/lib/ai-logic";
import { GameBoard } from "@/components/GameBoard";
import { createRoom, joinRoom, toggleReady, startGame } from "@/lib/online.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FTF – Face to Face | Jogo de adivinhar personagens" },
      {
        name: "description",
        content:
          "Jogue FTF - Face to Face: descubra o personagem secreto do adversário com perguntas de SIM ou NÃO. Modo contra IA em três dificuldades e partidas on-line.",
      },
      { property: "og:title", content: "FTF – Face to Face" },
      {
        property: "og:description",
        content: "Duelo de dedução com 24 personagens: faça perguntas, elimine cartas e acerte o palpite final.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

import { useEffect as useRealtimeEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function Lobby({ room, players, guestId, onLeave, onToggleReady, onStart }: any) {
  useRealtimeEffect(() => {
    const channel = supabase
      .channel(`lobby:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` },
        () => {
          // Trigger a refresh of players if needed, or rely on root component's effect
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  const me = players.find((p: any) => p.guest_id === guestId);
  const isHost = room.host_id === guestId;
  const allReady = players.length === 2 && players.every((p: any) => p.is_ready);

  return (
    <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-xl border border-white/10 bg-[#11151d] p-5">
        <div className="flex flex-col items-center gap-2 mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/70">Código da Sala</p>
          <div className="flex w-full items-center gap-2">
            <div className="flex-1 rounded-lg border-2 border-dashed border-yellow-400/30 bg-black/40 py-3 text-center text-3xl font-black tracking-[0.2em] text-yellow-400">
              {room.code}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}


function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 overflow-hidden bg-main-gradient p-4 text-center text-white sm:gap-10">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
        {/* Rotating Lightning/Energy effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180vmax] h-[180vmax] animate-lightning-spin opacity-30 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_40deg,#1e62ec_45deg,transparent_50deg,transparent_90deg,transparent_130deg,#e52e2e_135deg,transparent_140deg,transparent_180deg,transparent_220deg,#1e62ec_225deg,transparent_230deg,transparent_270deg,transparent_310deg,#e52e2e_315deg,transparent_320deg,transparent_360deg)] blur-2xl" />
        
        {/* Glow Pulses */}
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '-2s' }} />
        
        {/* Subtle Grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-10 w-full">
        {children}
      </div>
    </main>
  );
}

function BackButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 px-6 py-2 rounded-xl border-2 border-gray-400/30 bg-gray-800/50 font-black uppercase tracking-widest text-gray-400 transition-all hover:text-yellow-400 hover:border-yellow-400/50 hover:scale-105 active:scale-95 ${className}`}
    >
      <span className="text-xl">{"<"}</span> <span translate="no">MENU</span>
    </button>
  );
}
