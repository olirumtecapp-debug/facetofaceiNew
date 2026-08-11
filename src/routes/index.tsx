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
            <button
              onClick={() => {
                navigator.clipboard.writeText(room.code);
                toast.success("Código copiado!");
              }}
              className="rounded-lg bg-yellow-400 p-3 text-black transition-all hover:scale-105 active:scale-95"
            >
              📋
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Jogadores Conectados</p>
          {players.map((p: any) => (
            <div key={p.guest_id} className="flex items-center justify-between rounded-lg bg-white/5 p-3 border border-white/5">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${p.is_ready ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="font-black italic text-sm">
                  {p.guest_id === guestId ? "VOCÊ" : (p.name || "ADVERSÁRIO")} 
                  {p.guest_id === room.host_id && <span className="ml-2 text-[8px] text-blue-400">(HOST)</span>}
                </span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${p.is_ready ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {p.is_ready ? 'PRONTO' : 'AGUARDANDO'}
              </span>
            </div>
          ))}
          {players.length < 2 && (
            <div className="flex items-center gap-3 rounded-lg bg-blue-500/5 p-3 border border-blue-500/10">
              <div className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
              <p className="text-[10px] font-bold text-blue-400 animate-pulse uppercase tracking-widest">Aguardando adversário...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onToggleReady(!me?.is_ready)}
            className={`w-full rounded-lg py-3 font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${
              me?.is_ready 
                ? 'bg-yellow-500 border-yellow-400/50 text-black hover:brightness-110' 
                : 'bg-green-600 border-green-400/50 text-white hover:brightness-125'
            }`}
          >
            {me?.is_ready ? 'CANCELAR PRONTO' : 'ESTOU PRONTO'}
          </button>

          {isHost && (
            <button
              onClick={onStart}
              disabled={!allReady}
              className="w-full rounded-lg bg-[#1e62ec] py-3 font-black uppercase tracking-widest border-2 border-blue-400/50 transition-all hover:brightness-125 active:scale-95 disabled:opacity-40 disabled:grayscale"
            >
              INICIAR PARTIDA
            </button>
          )}

          <button
            onClick={onLeave}
            className="w-full rounded-lg bg-gray-800 py-3 font-black uppercase tracking-widest border-2 border-gray-600/50 transition-all hover:bg-gray-700 active:scale-95"
          >
            SAIR DA SALA
          </button>
        </div>
      </div>
    </div>
  );
}

type Screen = "MENU" | "CHOOSE_COLOR" | "CHOOSE_DIFFICULTY" | "GAME" | "ONLINE";
 
 function Index() {
   const [screen, setScreen] = useState<Screen>("MENU");
   const [showSettings, setShowSettings] = useState(false);
   const [showDonate, setShowDonate] = useState(false);
   const [isFullScreen, setIsFullScreen] = useState(false);
  const [playerColor, setPlayerColor] = useState<"AZUL" | "VERMELHO">("AZUL");
  const [difficulty, setDifficulty] = useState<Difficulty>("Médio");
  const [showChars, setShowChars] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const guestId = (typeof window !== 'undefined') 
    ? (localStorage.getItem("ftf_guest_id") || (() => {
        const id = crypto.randomUUID();
        localStorage.setItem("ftf_guest_id", id);
        return id;
      })())
    : "";
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [launchMode, setLaunchMode] = useState<"IA" | "ONLINE">("IA");

  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("ftf_player_name") || "";
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  
  const createRoomFn = useServerFn(createRoom);
  const joinRoomFn = useServerFn(joinRoom);
  const toggleReadyFn = useServerFn(toggleReady);
  const startGameFn = useServerFn(startGame);

  useRealtimeEffect(() => {
    if (!roomData?.id) return;

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomData.id);
      if (data) setPlayers(data);
    };

    fetchPlayers();

    const roomSub = supabase
      .channel(`room_state:${roomData.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomData.id}` },
        (payload) => {
          setRoomData(payload.new);
          if ((payload.new as any).status === "PLAYING") {
            setScreen("GAME");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomData.id}` },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomSub);
    };
  }, [roomData?.id]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const copyPix = () => {
    const pixCode = "00020101021126580014br.gov.bcb.pix0136ccc2fd5a-cc51-4626-ac9b-8010315042f55204000053039865802BR5924MURILO FERREIRA DA SILVA6009SAO PAULO622905251KYF6GJBG4K0TVYH7QKHP9TSD63042519";
    navigator.clipboard.writeText(pixCode);
    toast.success("Código PIX copiado! Banco C6 Favorecido Murilo Ferreira da Silva");
  };



  if (screen === "GAME") {
    const activeRoomCode = launchMode === "ONLINE" ? (roomCode || joinCode) : "";
    return (
      <GameBoard
        key={`${launchMode}-${activeRoomCode}`}
        playerColor={playerColor}
        difficulty={difficulty}
        onBack={() => {
          setScreen("MENU");
          setRoomData(null);
          setPlayers([]);
          setRoomCode("");
          setJoinCode("");
          setLaunchMode("IA");
        }}
        {...(activeRoomCode ? { initialRoomCode: activeRoomCode } : {})}
      />
    );
  }


  if (screen === "CHOOSE_DIFFICULTY") {
    return (
      <Shell>
        <h2 className="text-3xl font-black uppercase italic text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Dificuldade da IA</h2>
        <div className="grid w-full max-w-md gap-4">
          {(["Fácil", "Médio", "Difícil"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d);
                setScreen("CHOOSE_COLOR");
              }}
              className="group relative overflow-hidden rounded-xl border-2 border-blue-400/50 bg-gray-800/80 p-5 text-xl font-black italic tracking-wider transition-all hover:scale-105 hover:bg-gray-700 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95"
            >
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600/0 via-blue-600/30 to-blue-600/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative z-10">{d}</span>
            </button>
          ))}
        </div>
        <BackButton onClick={() => setScreen("MENU")} />
      </Shell>
    );
  }

  if (screen === "CHOOSE_COLOR") {
    return (
      <Shell>
        <h2 className="text-3xl font-black uppercase italic text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-4xl">Escolha sua cor</h2>
        <div className="flex w-full max-w-2xl flex-col gap-6 md:flex-row">
          {(["AZUL", "VERMELHO"] as const).map((c) => (
            <button
              key={c}
              onClick={() => {
                setPlayerColor(c);
                setScreen("GAME");
              }}
              className="group flex-1 rounded-2xl border-4 p-8 transition-all hover:scale-105 active:scale-95"
              style={{
                borderColor: c === "AZUL" ? "#1e62ec" : "#e52e2e",
                background: c === "AZUL" ? "rgba(30,98,236,0.5)" : "rgba(229,46,46,0.5)",
                boxShadow: c === "AZUL" ? "0 0 20px rgba(30,98,236,0.4)" : "0 0 20px rgba(229,46,46,0.4)"
              }}
            >
              <h3 className="text-2xl font-black italic tracking-tighter drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]" style={{ color: c === "AZUL" ? "#60a5fa" : "#f87171" }}>
                Tabuleiro {c.toLowerCase()}
              </h3>
            </button>
          ))}
        </div>
        <BackButton onClick={() => setScreen("CHOOSE_DIFFICULTY")} />
      </Shell>
    );
  }

  if (screen === "ONLINE") {
    return (
      <Shell>
        <h2 className="text-3xl font-black uppercase italic text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Jogar on-line</h2>
        
        {!roomData ? (
          <div className="w-full max-w-md space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#11151d] p-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Seu Nome</p>
              <input
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  localStorage.setItem("ftf_player_name", e.target.value);
                }}
                placeholder="Digite seu nome..."
                className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-center text-lg font-bold outline-none focus:border-yellow-400"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#11151d] p-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Criar sala (2 jogadores)</p>
              <button
                onClick={async () => {
                  if (!playerName.trim()) {
                    toast.error("Digite seu nome primeiro!");
                    return;
                  }
                  setIsConnecting(true);
                  try {
                    const res = await createRoomFn({ data: { guestId, playerName: playerName.trim() } });
                    setRoomCode(res.code);
                    setRoomData(res.room);
                    toast.success(`Sala ${res.code} criada!`);
                  } catch (e) {
                    toast.error("Erro ao criar sala.");
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                disabled={isConnecting}
                className="w-full rounded-lg bg-[#1e62ec] py-3 font-black uppercase tracking-widest border-2 border-blue-400/50 transition-all hover:brightness-125 active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? "Criando..." : "Gerar código"}
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#11151d] p-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Entrar em sala</p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="FTF-0000"
                className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-center text-xl font-black tracking-widest outline-none focus:border-yellow-400"
              />
              <button 
                onClick={async () => {
                  if (!playerName.trim()) {
                    toast.error("Digite seu nome primeiro!");
                    return;
                  }
                  if (!joinCode) return;
                  setIsConnecting(true);
                  try {
                    const res = await joinRoomFn({ data: { code: joinCode, guestId, playerName: playerName.trim() } });
                    setRoomData(res.room);
                    toast.success("Entrou na sala!");
                  } catch (e) {
                    toast.error("Sala não encontrada.");
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                disabled={isConnecting || !joinCode}
                className="w-full rounded-lg bg-[#e52e2e] py-3 font-black uppercase tracking-widest border-2 border-[#ff4444]/50 transition-all hover:brightness-125 active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? "Entrando..." : "Entrar"}
              </button>
            </div>
            <BackButton onClick={() => setScreen("MENU")} className="mt-4 w-full justify-center" />
          </div>
        ) : (
          <Lobby 
            room={roomData} 
            players={players} 
            guestId={guestId}
            onLeave={() => {
              setRoomData(null);
              setPlayers([]);
            }}
            onToggleReady={async (isReady: boolean) => {
              await toggleReadyFn({ data: { roomId: roomData.id, guestId, isReady } });
            }}
            onStart={async () => {
              try {
                await startGameFn({ data: { roomId: roomData.id, guestId } });
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          />
        )}
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <div className="relative w-full max-w-[600px] mx-auto select-none">
          <img
            src={homeAsset.url}
            alt="FTF - Face to Face"
            className="w-full h-auto block drop-shadow-2xl"
          />
          
          {/* VS IA Hotspot */}
          <button
            onClick={() => setScreen("CHOOSE_DIFFICULTY")}
            className="absolute left-[8%] top-[45%] w-[40%] h-[35%] opacity-0 cursor-pointer active:scale-95 transition-transform"
            aria-label="Jogar VS IA"
          />

          {/* ONLINE Hotspot */}
          <button
            onClick={() => setScreen("ONLINE")}
            className="absolute left-[52%] top-[45%] w-[40%] h-[35%] opacity-0 cursor-pointer active:scale-95 transition-transform"
            aria-label="Jogar On-line"
          />

          {/* Bottom Icons Row */}
          <div className="absolute bottom-[2%] left-0 w-full h-[15%] flex justify-between px-[5%]">
            {/* CONFIGURAÇÕES */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-[15%] h-full opacity-0 cursor-pointer active:scale-90 transition-transform"
              aria-label="Configurações"
            />
            {/* PERSONAGENS */}
            <button
              onClick={() => setShowChars(true)}
              className="w-[40%] h-full opacity-0 cursor-pointer active:scale-90 transition-transform"
              aria-label="Personagens"
            />
            {/* APOIAR */}
            <button
              onClick={() => setShowDonate(true)}
              className="w-[15%] h-full opacity-0 cursor-pointer active:scale-90 transition-transform"
              aria-label="Apoiar"
            />
          </div>

          {/* 
          <div className="absolute left-[8%] top-[45%] w-[40%] h-[35%] bg-red-500/20 pointer-events-none border border-red-500" />
          <div className="absolute left-[52%] top-[45%] w-[40%] h-[35%] bg-blue-500/20 pointer-events-none border border-blue-500" />
          <div className="absolute bottom-[2%] left-[5%] w-[15%] h-[15%] bg-yellow-500/20 pointer-events-none border border-yellow-500" />
          <div className="absolute bottom-[2%] left-[30%] w-[40%] h-[15%] bg-green-500/20 pointer-events-none border border-green-500" />
          <div className="absolute bottom-[2%] right-[5%] w-[15%] h-[15%] bg-pink-500/20 pointer-events-none border border-pink-500" />
          */}
        </div>
      </Shell>

      {showChars && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
          <div className="flex max-h-[95dvh] w-full max-w-4xl flex-col rounded-2xl border-2 border-yellow-400/30 bg-[#0b0e14] p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:p-6">
            <h2 className="mb-4 text-center text-2xl font-black uppercase italic text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:mb-6 sm:text-3xl">Personagens</h2>
            <div className="flex-1 overflow-auto custom-scrollbar p-1">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 sm:gap-4 lg:gap-6">
                {CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCharId(c.id)}
                    className="group relative flex flex-col items-center transition-all hover:z-10"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-[#d4af37] bg-gray-200 p-1 shadow-lg transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] group-active:scale-95">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-gray-200">
                        <img
                          src={CARD_IMAGES.AZUL[c.id - 1]!}
                          alt={c.nome}
                          className="h-full w-full object-cover object-center contrast-110"
                        />
                      </div>
                    </div>
                    <span className="mt-2 text-[10px] font-black uppercase italic tracking-tighter text-gray-400 transition-colors group-hover:text-yellow-400 sm:text-xs">
                      {c.nome}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowChars(false)}
              className="mt-4 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-3 font-black tracking-widest text-white transition-all hover:bg-gray-700 hover:scale-[1.02] active:scale-95"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {selectedCharId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-[320px] sm:max-w-md rounded-2xl border-4 border-[#d4af37] bg-[#e0e0e0] p-1 shadow-[0_0_50px_rgba(212,175,55,0.3)]">
            {(() => {
              const c = CHARACTERS.find(char => char.id === selectedCharId)!;
              const details = CHARACTER_DETAILS.find(d => d.name.toUpperCase() === c.nome.toUpperCase())!;
              return (
                <div className="flex flex-col items-center p-4 text-gray-900">
                  <div className="w-24 sm:w-32 aspect-square mb-4 overflow-hidden rounded-xl border-2 border-[#d4af37]/30 bg-white/50 p-1">
                    <img src={CARD_IMAGES.AZUL[c.id - 1]!} alt={c.nome} className="h-full w-full object-contain contrast-125" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-[#1e62ec] mb-2">{c.nome}</h3>
                  <div className="grid grid-cols-1 gap-y-1.5 w-full text-left font-bold text-[10px] sm:text-xs bg-white/40 p-3 rounded-xl border border-black/5">
                    <p className="flex justify-between border-b border-black/5 pb-1"><span className="text-gray-500 uppercase text-[8px]">Profissão:</span> {details.profession}</p>
                    <p className="flex justify-between border-b border-black/5 pb-1"><span className="text-gray-500 uppercase text-[8px]">Personalidade:</span> {details.personality}</p>
                    <p className="flex justify-between border-b border-black/5 pb-1"><span className="text-gray-500 uppercase text-[8px]">Hobbies:</span> {details.hobbies.join(", ")}</p>
                    <p className="flex flex-col gap-0.5"><span className="text-gray-500 uppercase text-[8px]">Sobre:</span> <span className="text-[11px] leading-tight text-gray-800 italic">{details.bio}</span></p>
                  </div>
                  <button
                    onClick={() => setSelectedCharId(null)}
                    className="mt-6 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-4 font-black tracking-[0.2em] text-white transition-all hover:bg-gray-700 hover:scale-[1.05] active:scale-95"
                  >
                    VOLTAR
                  </button>
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
            
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Visualização</p>
                <button
                  onClick={toggleFullScreen}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
                >
                  <span className="font-bold">Tela Cheia</span>
                  <span className="text-xl">{isFullScreen ? "📴" : "📺"}</span>
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Instalação</p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Para instalar no <span className="text-white font-bold">Smartphone</span> ou <span className="text-white font-bold">PC</span>:
                    Clique nos três pontos do navegador e selecione <span className="text-yellow-400">"Instalar Aplicativo"</span> ou <span className="text-yellow-400">"Adicionar à tela de início"</span>.
                  </p>
                  <p className="text-[10px] text-gray-500 italic">
                    Endereço para PC/Notebook: https://facetofacei.lovable.app
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-3 font-black tracking-widest text-white transition-all hover:bg-gray-700 active:scale-95"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {showDonate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500/30 bg-[#0b0e14] p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-black uppercase italic text-red-500 text-center">Apoiar Projeto</h2>
            
            <div className="flex flex-col items-center gap-6">
              <div className="text-4xl">🎁</div>
              <p className="text-center text-sm leading-relaxed text-gray-300">
                Se você gosta do <span className="text-white font-bold uppercase italic tracking-tighter">FTF</span>, considere apoiar o desenvolvimento para mantermos o servidor online!
              </p>
              
              <div className="w-full space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase text-gray-500">Favorecido</span>
                  <span className="text-xs font-bold text-white">Murilo Ferreira da Silva</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase text-gray-500">Banco</span>
                  <span className="text-xs font-bold text-white">C6 Bank</span>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-[10px] font-black uppercase text-gray-500 text-center">Chave PIX (Copia e Cola)</span>
                  <button
                    onClick={copyPix}
                    className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 py-3 px-4 text-xs font-black text-black transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    COPIAR CÓDIGO PIX
                    <span className="text-base group-active:animate-ping">📋</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDonate(false)}
              className="mt-8 w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-3 font-black tracking-widest text-white transition-all hover:bg-gray-700 active:scale-95"
            >
              VOLTAR
            </button>
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
      <span className="text-xl">{"<"}</span> VOLTAR
    </button>
  );
}
