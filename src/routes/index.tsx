import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Shell } from "@/components/Shell";
import { BackButton } from "@/components/BackButton";
import { useGame } from "@/context/GameContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRoom, joinRoom } from "@/lib/online.functions";
import { useServerFn } from "@tanstack/react-start";
import { CHARACTERS } from "@/data/characters";
import { CARD_IMAGES } from "@/assets/chars/index";
import { CHARACTER_DETAILS } from "@/data/character-details";

const logoAsset = { url: "https://facetofacei.lovable.app/lovable-uploads/4a796fa0-2b1b-4f9e-adcd-533cc2d425b0.png" };
const playIaAsset = { url: "https://facetofacei.lovable.app/lovable-uploads/10e05030-f8f8-4e8c-8598-a83689408e08.png" };
const playOnlineAsset = { url: "https://facetofacei.lovable.app/lovable-uploads/47dbd394-1436-4074-a63e-b830e0a5746b.png" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Face to Face - Jogo de Adivinhação Online" },
      { name: "description", content: "O clássico jogo de adivinhação Face to Face agora online e contra IA. Desafie seus amigos!" },
      { property: "og:title", content: "Face to Face - Jogo de Adivinhação Online" },
      { property: "og:description", content: "O clássico jogo de adivinhação Face to Face agora online e contra IA. Desafie seus amigos!" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { setScreen, setDifficulty, setGameMode, setRoomCode: setGlobalRoomCode, screen } = useGame();
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showChars, setShowChars] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [guestId, setGuestId] = useState<string>("");

  const createRoomFn = useServerFn(createRoom);
  const joinRoomFn = useServerFn(joinRoom);

  useEffect(() => {
    let gid = localStorage.getItem("ftf_guest_id");
    if (!gid) {
      gid = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("ftf_guest_id", gid);
    }
    setGuestId(gid);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const copyPix = () => {
    const pix = "00020126580014BR.GOV.BCB.PIX0136d8d62688-6648-4389-9b93-b248e35ef58e5204000053039865802BR5923Murilo Ferreira da Silva6009SAO PAULO62070503***63047271";
    navigator.clipboard.writeText(pix);
    toast.success("Código PIX copiado!");
  };

  if (roomCode) {
    return (
      <>
        <Shell>
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#11151d] p-5">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Sala Multiplayer</p>
            <Lobby 
              roomCode={roomCode} 
              guestId={guestId} 
              onStart={() => {
                setGlobalRoomCode(roomCode);
                setGameMode("ONLINE");
                setScreen("GAME");
              }} 
              onBack={() => setRoomCode("")} 
            />
          </div>
          <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
            A sincronização em tempo real está ATIVA.
          </p>
        </div>
        <BackButton onClick={() => setRoomCode("")} className="mt-6" />
      </Shell>
      </>
    );
  }

  if (screen === "ONLINE") {
    return (
      <>
        <Shell>
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#11151d] p-5">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Criar ou Entrar em sala</p>
            
            <div className="space-y-4">
              <button
                onClick={async () => {
                  setIsConnecting(true);
                  try {
                    const res = await createRoomFn({ data: { guestId } });
                    setRoomCode(res.code);
                    toast.success("Sala criada!");
                  } catch (e) {
                    toast.error("Erro ao criar sala.");
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                disabled={isConnecting}
                className="w-full rounded-lg bg-[#1e62ec] py-3 font-black uppercase tracking-widest border-2 border-blue-400/50 transition-all hover:brightness-125 hover:shadow-[0_0_15px_rgba(30,98,236,0.5)] active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? "Criando..." : "Criar Nova Sala"}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="mx-4 flex-shrink text-[10px] font-black uppercase tracking-widest text-gray-500">OU</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <div className="space-y-3">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="DIGITE O CÓDIGO (EX: FTF-1234)"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-center text-xl font-black tracking-widest outline-none focus:border-yellow-400"
                />
                <button 
                  onClick={async () => {
                    if (!joinCode) return;
                    setIsConnecting(true);
                    try {
                      await joinRoomFn({ data: { code: joinCode, guestId } });
                      setRoomCode(joinCode);
                      toast.success("Entrou na sala!");
                    } catch (e) {
                      toast.error("Sala não encontrada ou cheia.");
                    } finally {
                      setIsConnecting(false);
                    }
                  }}
                  disabled={isConnecting || !joinCode}
                  className="w-full rounded-lg bg-[#e52e2e] py-3 font-black uppercase tracking-widest border-2 border-[#ff4444]/50 transition-all hover:brightness-125 hover:shadow-[0_0_15px_rgba(229,46,46,0.5)] active:scale-95 disabled:opacity-50"
                >
                  {isConnecting ? "Entrando..." : "Entrar na Sala"}
                </button>
              </div>
            </div>
          </div>
          <BackButton onClick={() => setScreen("MENU")} className="mt-6 w-full justify-center" />
        </div>
      </Shell>
      </>
    );
  }

  return (
    <>
      <Shell>
        <div className="relative group flex items-center justify-center">
          <img src={logoAsset.url} alt="FTF" className="h-32 w-auto object-contain sm:h-48 md:h-56 relative z-10" />
        </div>
        
        <div className="flex w-full flex-col items-center justify-center gap-10 sm:flex-row sm:gap-16">
          <div className="group relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-blue-500/40 blur-3xl opacity-60 transition-opacity group-hover:opacity-100" />
            <button
              onClick={() => {
                setGameMode("IA");
                setScreen("CHOOSE_DIFFICULTY");
              }}
              className="relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border-4 border-[#1e62ec] bg-gray-200 p-1 transition-all hover:scale-105 active:scale-95 sm:h-28 sm:w-40 md:h-32 md:w-48"
            >
              <img src={playIaAsset.url} alt="IA" className="h-[85%] w-auto object-contain" />
            </button>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-red-500/40 blur-3xl opacity-60 transition-opacity group-hover:opacity-100" />
            <button
              onClick={() => {
                setGameMode("ONLINE");
                setScreen("ONLINE");
              }}
              className="relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border-4 border-[#e52e2e] bg-gray-200 p-1 transition-all hover:scale-105 active:scale-95 sm:h-28 sm:w-40 md:h-32 md:w-48"
            >
              <img src={playOnlineAsset.url} alt="Online" className="h-[85%] w-auto object-contain" />
            </button>
          </div>
        </div>

        <div className="flex w-full max-w-lg items-center justify-between px-4 mt-10">
          <button onClick={() => setShowSettings(true)} className="text-2xl p-2 rounded-lg border border-white/20 bg-gray-800/40">⚙️</button>
          <button onClick={() => setShowChars(true)} className="rounded-full border-2 border-yellow-400/50 bg-gray-800/80 px-6 py-2.5 text-[10px] font-black tracking-[0.2em]">👤 PERSONAGENS</button>
          <button onClick={() => setShowDonate(true)} className="text-2xl p-2 rounded-lg border border-white/20 bg-gray-800/40">💗</button>
        </div>
      </Shell>

      {showChars && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
          <div className="flex max-h-[95dvh] w-full max-w-4xl flex-col rounded-2xl border-2 border-yellow-400/30 bg-[#0b0e14] p-4 sm:p-6">
            <h2 className="mb-4 text-center text-2xl font-black uppercase italic text-yellow-400 sm:text-3xl">Personagens</h2>
            <div className="flex-1 overflow-auto p-1">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {CHARACTERS.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCharId(c.id as any)} className="group flex flex-col items-center">
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-[#d4af37] bg-gray-200 p-1 transition-all group-hover:scale-110">
                      <img src={CARD_IMAGES.AZUL[c.id - 1]} alt={c.nome} className="h-full w-full object-cover" />
                    </div>
                    <span className="mt-2 text-[10px] font-black uppercase text-gray-400">{c.nome}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowChars(false)} className="mt-4 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-3 font-black text-white">FECHAR</button>
          </div>
        </div>
      )}

      {selectedCharId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-[320px] rounded-2xl border-4 border-[#d4af37] bg-[#e0e0e0] p-4 text-gray-900">
            {(() => {
              const c = CHARACTERS.find(char => char.id === selectedCharId)!;
              const details = CHARACTER_DETAILS.find(d => d.name.toUpperCase() === c.nome.toUpperCase())!;
              return (
                <div className="flex flex-col items-center">
                  <div className="w-24 aspect-square mb-4 overflow-hidden rounded-xl border-2 border-[#d4af37]/30 bg-white/50 p-1">
                    <img src={CARD_IMAGES.AZUL[c.id - 1]} alt={c.nome} className="h-full w-full object-contain" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase text-[#1e62ec] mb-2">{c.nome}</h3>
                  <div className="w-full text-left font-bold text-[10px] bg-white/40 p-3 rounded-xl border border-black/5">
                    <p>Profissão: {details.profession}</p>
                    <p>Personalidade: {details.personality}</p>
                    <p>Hobbies: {details.hobbies.join(", ")}</p>
                    <p className="mt-2 italic">{details.bio}</p>
                  </div>
                  <button onClick={() => setSelectedCharId(null)} className="mt-6 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-4 font-black text-white">VOLTAR</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-yellow-400/30 bg-[#0b0e14] p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-black uppercase italic text-yellow-400 text-center">Configurações</h2>
            <button onClick={toggleFullScreen} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="font-bold">Tela Cheia</span>
              <span className="text-xl">{isFullScreen ? "📴" : "📺"}</span>
            </button>
            <button onClick={() => setShowSettings(false)} className="mt-8 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-3 font-black text-white">FECHAR</button>
          </div>
        </div>
      )}

      {showDonate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500/30 bg-[#0b0e14] p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-black uppercase italic text-red-500 text-center">Apoiar Projeto</h2>
            <p className="text-center text-sm text-gray-300 mb-6">Se você gosta do FTF, considere apoiar o servidor!</p>
            <button onClick={copyPix} className="w-full rounded-lg bg-yellow-400 py-3 text-black font-black">COPIAR CÓDIGO PIX</button>
            <button onClick={() => setShowDonate(false)} className="mt-8 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-3 font-black text-white">VOLTAR</button>
          </div>
        </div>
      )}
    </>
  );
}

function Lobby({ roomCode, guestId, onStart, onBack }: { roomCode: string; guestId: string; onStart: () => void; onBack: () => void }) {
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data: roomData } = await supabase.from("rooms").select("*").eq("code", roomCode).single();
      if (roomData) {
        setRoom(roomData);
        const { data: playersData } = await supabase.from("room_players").select("*").eq("room_id", roomData.id);
        setPlayers(playersData || []);
        const me = playersData?.find((p) => p.guest_id === guestId);
        if (me) setIsReady(!!me.is_ready);
      }
    };

    fetchRoom();

    const channel = supabase
      .channel(`lobby:${roomCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` }, (payload) => {
        setRoom(payload.new);
        if ((payload.new as any).status === "PLAYING") onStart();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, async () => {
        const { data: roomData } = await supabase.from("rooms").select("id").eq("code", roomCode).single();
        if (roomData) {
          const { data: playersData } = await supabase.from("room_players").select("*").eq("room_id", roomData.id);
          setPlayers(playersData || []);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, guestId, onStart]);

  const toggleReady = async () => {
    const newReady = !isReady;
    setIsReady(newReady);
    await supabase.from("room_players").update({ is_ready: newReady }).eq("room_id", room.id).eq("guest_id", guestId);
  };

  const startGame = async () => {
    await supabase.from("rooms").update({ status: "PLAYING" }).eq("id", room.id);
  };

  const allReady = players.length === 2 && players.every((p) => p.is_ready);
  const isHost = players.length > 0 && players[0].guest_id === guestId;

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/70">Código da Sala</p>
        <div className="flex w-full items-center gap-2">
          <div className="flex-1 rounded-lg border-2 border-dashed border-yellow-400/30 bg-black/40 py-3 text-center text-3xl font-black tracking-[0.2em] text-yellow-400">
            {roomCode}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomCode);
              toast.success("Código copiado!");
            }}
            className="rounded-lg bg-yellow-400 p-3 text-black transition-all hover:scale-105 active:scale-95"
          >
            📋
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Jogadores Conectados</p>
        <div className="grid gap-2">
          {players.map((p, idx) => (
            <div key={p.guest_id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${p.is_ready ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {p.guest_id === guestId ? "Você (P" + (idx + 1) + ")" : "Adversário (P" + (idx + 1) + ")"}
                </span>
              </div>
              <span className={`text-[9px] font-black uppercase ${p.is_ready ? "text-green-500" : "text-gray-500"}`}>
                {p.is_ready ? "PRONTO" : "AGUARDANDO"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={toggleReady}
          className={`w-full rounded-lg py-3 font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${
            isReady ? "border-green-500/50 bg-green-600/20 text-green-500" : "border-yellow-400/50 bg-yellow-400 text-black"
          }`}
        >
          {isReady ? "ESTOU PRONTO!" : "FICAR PRONTO"}
        </button>

        {isHost && (
          <button
            onClick={startGame}
            disabled={!allReady}
            className="w-full rounded-lg bg-blue-600 py-3 font-black border-2 border-blue-400/50 transition-all active:scale-95 disabled:opacity-40"
          >
            INICIAR PARTIDA
          </button>
        )}
      </div>
    </div>
  );
}
