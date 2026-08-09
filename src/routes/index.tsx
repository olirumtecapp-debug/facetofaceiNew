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
          <div className="text-center">
            <p className="text-yellow-400 font-black text-2xl tracking-widest">{roomCode}</p>
            <button
              onClick={async () => {
                await updateReadyFn({ data: { roomId: roomCode, guestId, isReady: true } });
                toast.success("Pronto!");
              }}
              className="mt-4 w-full bg-green-600 py-3 rounded-lg"
            >
              ESTOU PRONTO
            </button>
            <button
              onClick={async () => {
                await startGameFn({ data: { roomId: roomCode, guestId } });
                setScreen("GAME");
              }}
              className="mt-2 w-full bg-blue-600 py-3 rounded-lg"
            >
              INICIAR PARTIDA
            </button>
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
