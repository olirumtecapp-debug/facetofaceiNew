import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import logoAsset from "@/assets/Logo_FTF_transparente.png.asset.json";
import playIaAsset from "@/assets/play-ia.png.asset.json";
import playOnlineAsset from "@/assets/play-online.png.asset.json";
import { CARD_IMAGES } from "@/assets/chars";
import { CHARACTERS } from "@/data/characters";
import { CHARACTER_DETAILS } from "@/data/character-details";
import { Difficulty } from "@/lib/ai-logic";
import { GameBoard } from "@/components/GameBoard";
import { createRoom, joinRoom, updatePlayerReady, startGame } from "@/lib/online.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

export const Route = createFileRoute("/")({
  component: Index,
});

type Screen = "MENU" | "CHOOSE_COLOR" | "CHOOSE_DIFFICULTY" | "GAME" | "ONLINE" | "LOBBY";

const getGuestId = () => {
  let id = typeof window !== 'undefined' ? localStorage.getItem("ftf_guest_id") : null;
  if (!id && typeof window !== 'undefined') {
    id = uuidv4();
    localStorage.setItem("ftf_guest_id", id);
  }
  return id || 'temp-id';
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 overflow-hidden bg-main-gradient p-4 text-center text-white">
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        {children}
      </div>
    </main>
  );
}

function BackButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={`text-white p-2 border border-white/20 rounded-lg ${className}`}>
      VOLTAR
    </button>
  );
}

function OnlineLobby({ screen, setScreen, guestId, roomCode, setRoomCode, joinCode, setJoinCode, createRoomFn, joinRoomFn, updateReadyFn, startGameFn }: any) {
  return (
    <Shell>
      <h2 className="text-3xl font-black uppercase italic text-yellow-400">Lobby Online</h2>
      <div className="w-full max-w-md bg-[#11151d] p-5 rounded-xl border border-white/10">
        {!roomCode && screen === "ONLINE" && (
          <div className="space-y-4">
            <button
              onClick={async () => {
                const res = await createRoomFn({ data: { guestId } });
                setRoomCode(res.code);
                setScreen("LOBBY");
              }}
              className="w-full bg-blue-600 py-3 rounded-lg font-black uppercase"
            >
              Criar Sala
            </button>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="FTF-0000"
              className="w-full bg-black/40 p-3 rounded-lg text-center"
            />
            <button
              onClick={async () => {
                await joinRoomFn({ data: { code: joinCode, guestId } });
                setRoomCode(joinCode);
                setScreen("LOBBY");
              }}
              className="w-full bg-red-600 py-3 rounded-lg font-black uppercase"
            >
              Entrar
            </button>
          </div>
        )}
        {screen === "LOBBY" && (
          <div className="flex flex-col gap-6 text-center">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Código da Sala</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-yellow-400 font-black text-4xl tracking-widest drop-shadow-md">{roomCode}</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode);
                    toast.success("Código copiado!");
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="py-4 border-y border-white/5 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Status dos Jogadores</p>
              <div className="flex items-center justify-between text-sm px-4">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Você
                </span>
                <span className="text-green-400 font-bold">PRONTO</span>
              </div>
              <div className="flex items-center justify-between text-sm px-4">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                  Adversário
                </span>
                <span className="text-gray-500">AGUARDANDO...</span>
              </div>
            </div>

            <button
              onClick={async () => {
                await startGameFn({ data: { roomId: roomCode, guestId } });
                setScreen("GAME");
              }}
              className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-xl uppercase italic tracking-widest shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              COMEÇAR JOGO!
            </button>
            <p className="text-[10px] text-gray-500 italic">O anfitrião deve iniciar a partida após todos estarem prontos.</p>
          </div>
        )}
      </div>
      <BackButton onClick={() => setScreen("MENU")} />
    </Shell>
  );
}

function Index() {
  const guestId = getGuestId();
  const [screen, setScreen] = useState<Screen>("MENU");
  const [playerColor, setPlayerColor] = useState<"AZUL" | "VERMELHO">("AZUL");
  const [difficulty, setDifficulty] = useState<Difficulty>("Médio");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const createRoomFn = useServerFn(createRoom);
  const joinRoomFn = useServerFn(joinRoom);
  const updateReadyFn = useServerFn(updatePlayerReady);
  const startGameFn = useServerFn(startGame);

  if (screen === "GAME") return <GameBoard playerColor={playerColor} difficulty={difficulty} onBack={() => setScreen("MENU")} initialRoomCode={roomCode || joinCode} />;
  
  if (screen === "ONLINE" || screen === "LOBBY") {
    return (
      <OnlineLobby 
        screen={screen}
        setScreen={setScreen}
        guestId={guestId}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        createRoomFn={createRoomFn}
        joinRoomFn={joinRoomFn}
        updateReadyFn={updateReadyFn}
        startGameFn={startGameFn}
      />
    );
  }

  return (
    <Shell>
      <img src={logoAsset.url} className="h-40" />
      <div className="flex gap-4">
        <button onClick={() => setScreen("CHOOSE_DIFFICULTY")} className="bg-blue-600 p-6 rounded-xl">JOGAR IA</button>
        <button onClick={() => setScreen("ONLINE")} className="bg-red-600 p-6 rounded-xl">JOGAR ONLINE</button>
      </div>
    </Shell>
  );
}
