import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import logoAsset from "@/assets/logo.png.asset.json";
import playIaAsset from "@/assets/play-ia.png.asset.json";
import playOnlineAsset from "@/assets/play-online.png.asset.json";
import boardAzulAsset from "@/assets/CardsAzul.png.asset.json";
import boardVermelhoAsset from "@/assets/CardsVermelho.png.asset.json";
import { CARD_IMAGES } from "@/assets/chars";
import { CHARACTERS } from "@/data/characters";
import { CHARACTER_DETAILS } from "@/data/character-details";
import { Difficulty } from "@/lib/ai-logic";
import { GameBoard } from "@/components/GameBoard";
import { createRoom, joinRoom } from "@/lib/online.functions";
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

type Screen = "MENU" | "CHOOSE_COLOR" | "CHOOSE_DIFFICULTY" | "GAME" | "ONLINE";

function Index() {
  const [screen, setScreen] = useState<Screen>("MENU");
  const [playerColor, setPlayerColor] = useState<"AZUL" | "VERMELHO">("AZUL");
  const [difficulty, setDifficulty] = useState<Difficulty>("Médio");
  const [showChars, setShowChars] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const createRoomFn = useServerFn(createRoom);
  const joinRoomFn = useServerFn(joinRoom);


  if (screen === "GAME") {
    return <GameBoard playerColor={playerColor} difficulty={difficulty} onBack={() => setScreen("MENU")} />;
  }

  if (screen === "CHOOSE_DIFFICULTY") {
    return (
      <Shell>
        <h2 className="text-3xl font-black uppercase italic text-yellow-400">Dificuldade da IA</h2>
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
        <h2 className="text-3xl font-black uppercase italic text-yellow-400 sm:text-4xl">Escolha sua cor</h2>
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
                background: c === "AZUL" ? "rgba(30,98,236,0.12)" : "rgba(229,46,46,0.12)",
                boxShadow: c === "AZUL" ? "0 0 20px rgba(30,98,236,0.2)" : "0 0 20px rgba(229,46,46,0.2)"
              }}
            >
              <h3 className="text-2xl font-black italic tracking-tighter" style={{ color: c === "AZUL" ? "#1e62ec" : "#e52e2e" }}>
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
        <h2 className="text-3xl font-black uppercase italic text-yellow-400">Jogar on-line</h2>
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#11151d] p-5">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Criar sala (2 jogadores)</p>
            <button
              onClick={async () => {
                setIsConnecting(true);
                try {
                  const res = await createRoomFn();
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
              {isConnecting ? "Criando..." : "Gerar código"}
            </button>
            {roomCode && (
              <p className="mt-3 text-center text-2xl font-black tracking-widest text-yellow-400">{roomCode}</p>
            )}
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
                if (!joinCode) return;
                setIsConnecting(true);
                try {
                  await joinRoomFn({ data: { code: joinCode } });
                  setScreen("GAME"); 
                  toast.success("Entrou na sala!");
                } catch (e) {
                  toast.error("Sala não encontrada ou erro ao entrar.");
                } finally {
                  setIsConnecting(false);
                }
              }}
              disabled={isConnecting || !joinCode}
              className="w-full rounded-lg bg-[#e52e2e] py-3 font-black uppercase tracking-widest border-2 border-[#ff4444]/50 transition-all hover:brightness-125 hover:shadow-[0_0_15px_rgba(229,46,46,0.5)] active:scale-95 disabled:opacity-50"
            >
              {isConnecting ? "Entrando..." : "Entrar"}
            </button>
            <BackButton onClick={() => setScreen("MENU")} className="mt-4 w-full justify-center" />

          </div>
          <p className="text-center text-xs text-gray-500">
            As salas funcionam localmente nesta versão; a sincronização em tempo real entre dois dispositivos precisa do
            backend ativado.
          </p>
        </div>
        <BackButton onClick={() => setScreen("MENU")} className="mt-6" />
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <div className="flex w-full items-center justify-center">
          <img
            src={logoAsset.url}
            alt="FTF - Face to Face"
            className="h-24 w-auto object-contain sm:h-32 md:h-36"
          />
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-10 sm:flex-row sm:gap-16">
          {/* Botão Jogar vs IA */}
          <div className="group relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-blue-500/40 blur-3xl opacity-60 transition-opacity group-hover:opacity-100 animate-pulse-glow" />
            <button
              onClick={() => setScreen("CHOOSE_DIFFICULTY")}
              className="relative flex h-24 w-auto items-center justify-center overflow-hidden rounded-xl border-4 border-[#1e62ec] bg-[#e0e0e0] transition-all hover:scale-105 active:scale-95 sm:h-28 md:h-32"
            >
              <img 
                src={playIaAsset.url} 
                alt="Jogar vs IA" 
                className="h-full w-auto object-contain" 
              />
            </button>
          </div>

          {/* Botão Jogar on-line */}
          <div className="group relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-red-500/40 blur-3xl opacity-60 transition-opacity group-hover:opacity-100 animate-pulse-glow" style={{ animationDelay: '-2s' }} />
            <button
              onClick={() => setScreen("ONLINE")}
              className="relative flex h-24 w-auto items-center justify-center overflow-hidden rounded-xl border-4 border-[#e52e2e] bg-[#e0e0e0] transition-all hover:scale-105 active:scale-95 sm:h-28 md:h-32"
            >
              <img 
                src={playOnlineAsset.url} 
                alt="Jogar on-line" 
                className="h-full w-auto object-contain" 
              />
            </button>
          </div>
        </div>
        <div className="flex w-full max-w-lg items-center justify-between px-4">
          <button 
            className="text-2xl transition-all hover:scale-125 hover:rotate-90 active:scale-90 p-2 rounded-lg border border-white/20 bg-gray-800/40" 
            aria-label="Configurações"
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowChars(true)}
            className="group relative overflow-hidden rounded-full border-2 border-yellow-400/50 bg-gray-800/80 px-6 py-2.5 text-[10px] font-black tracking-[0.2em] transition-all hover:scale-105 hover:bg-gray-700 hover:shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-yellow-400/0 via-yellow-400/20 to-yellow-400/0 opacity-0 transition-opacity group-hover:opacity-100" />
            👤 PERSONAGENS
          </button>
          <button 
            className="text-2xl transition-all hover:scale-125 active:scale-90 p-2 rounded-lg border border-white/20 bg-gray-800/40" 
            aria-label="Favoritos"
          >
            💗
          </button>
        </div>
      </Shell>

      {showChars && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
          <div className="flex max-h-[95dvh] w-full max-w-4xl flex-col rounded-2xl border-2 border-yellow-400/30 bg-[#0b0e14] p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:p-6">
            <h2 className="mb-4 text-center text-2xl font-black uppercase italic text-yellow-400 sm:mb-6 sm:text-3xl">Personagens</h2>
            <div className="flex-1 overflow-auto custom-scrollbar p-1">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 sm:gap-4 lg:gap-6">
                {CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCharId(c.id)}
                    className="group relative flex flex-col items-center transition-all hover:z-10"
                  >
                    <div className="relative flex aspect-[178/224] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-[#d4af37] bg-[#c0c0c0] shadow-lg transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] group-active:scale-95">
                      <img
                        src={CARD_IMAGES.AZUL[c.id - 1]!}
                        alt={c.nome}
                        className="h-full w-full object-cover object-center"
                      />
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
                  <div className="flex w-24 sm:w-32 aspect-[178/224] mb-4 items-center justify-center overflow-hidden rounded-xl border-2 border-[#d4af37] bg-[#c0c0c0]">
                    <img src={CARD_IMAGES.AZUL[c.id - 1]!} alt={c.nome} className="h-full w-full object-cover object-center" />
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
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-b from-[#0b0e14] via-[#0b0e14] to-[#1e62ec]/30 p-4 text-center text-white sm:gap-10">
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
