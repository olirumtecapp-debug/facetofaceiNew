import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import logoAsset from "@/assets/logo.png.asset.json";
import playIaAsset from "@/assets/play-ia.png.asset.json";
import playOnlineAsset from "@/assets/play-online.png.asset.json";
import { CARD_IMAGES } from "@/assets/chars";
import { CHARACTERS } from "@/data/characters";
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
              className="rounded-xl border border-white/10 bg-gray-800 p-5 text-xl font-bold transition-all hover:scale-105 hover:bg-gray-700"
            >
              {d}
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
              className="flex-1 rounded-2xl border-4 p-8 transition-all hover:scale-105"
              style={{
                borderColor: c === "AZUL" ? "#1e62ec" : "#e52e2e",
                background: c === "AZUL" ? "rgba(30,98,236,0.12)" : "rgba(229,46,46,0.12)",
              }}
            >
              <img src={CARD_IMAGES[c][0]!} alt={`Tabuleiro ${c.toLowerCase()}`} className="mx-auto mb-4 h-32 w-auto" />
              <h3 className="text-2xl font-black" style={{ color: c === "AZUL" ? "#1e62ec" : "#e52e2e" }}>
                {c}
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
              className="w-full rounded-lg bg-[#1e62ec] py-3 font-black uppercase hover:brightness-110 disabled:opacity-50"
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
                  setScreen("GAME"); // For now just transition, real sync comes later
                  toast.success("Entrou na sala!");
                } catch (e) {
                  toast.error("Sala não encontrada ou erro ao entrar.");
                } finally {
                  setIsConnecting(false);
                }
              }}

              disabled={isConnecting || !joinCode}
              className="w-full rounded-lg bg-[#e52e2e] py-3 font-black uppercase hover:brightness-110 disabled:opacity-50"
            >
              {isConnecting ? "Entrando..." : "Entrar"}
            </button>

          </div>
          <p className="text-center text-xs text-gray-500">
            As salas funcionam localmente nesta versão; a sincronização em tempo real entre dois dispositivos precisa do
            backend ativado.
          </p>
        </div>
        <BackButton onClick={() => setScreen("MENU")} />
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <img
          src={logoAsset.url}
          alt="FTF - Face to Face"
          className="h-24 w-auto object-contain sm:h-40 md:h-48"
        />
        <div className="flex w-full flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
          <button
            onClick={() => setScreen("CHOOSE_DIFFICULTY")}
            className="w-[65vw] max-w-[300px] transition-transform hover:scale-105 active:scale-95"
          >
            <img src={playIaAsset.url} alt="Jogar vs IA" className="h-auto w-full object-contain" />
          </button>
          <button
            onClick={() => setScreen("ONLINE")}
            className="w-[60vw] max-w-[275px] transition-transform hover:scale-105 active:scale-95"
          >
            <img src={playOnlineAsset.url} alt="Jogar on-line" className="h-auto w-full object-contain" />
          </button>
        </div>
        <div className="flex w-full max-w-lg items-center justify-between px-4">
          <button className="text-2xl transition-transform hover:scale-110" aria-label="Configurações">
            ⚙️
          </button>
          <button
            onClick={() => setShowChars(true)}
            className="rounded-full bg-gray-800 px-6 py-2 text-sm font-bold transition-colors hover:bg-gray-700"
          >
            👤 PERSONAGENS
          </button>
          <button className="text-2xl transition-transform hover:scale-110" aria-label="Favoritos">
            💗
          </button>
        </div>
      </Shell>

      {showChars && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
          <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#0b0e14] p-4">
            <h2 className="mb-3 text-center text-2xl font-black uppercase italic text-yellow-400">Personagens</h2>
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto custom-scrollbar sm:grid-cols-3 lg:grid-cols-4">
              {CHARACTERS.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/5 bg-black/30 p-2">
                  <img src={CARD_IMAGES.AZUL[c.id - 1]!} alt={c.nome} className="mx-auto h-28 w-auto object-contain" />
                  <ul className="mt-2 space-y-0.5 text-[10px] leading-tight text-gray-400">
                    <li>{c.genero}</li>
                    <li>Cabelo: {c.corCabelo} · {c.estiloCabelo}</li>
                    <li>Pele: {c.tomPele} · Olhos: {c.corOlhos}</li>
                    <li>Barba: {c.barbaBigode}</li>
                    <li>
                      Óculos: {c.oculos ? "Sim" : "Não"} · Brincos: {c.brincos ? "Sim" : "Não"}
                    </li>
                    <li>Cabeça: {c.chapeuBoneFaixa}</li>
                    <li>Extra: {c.acessoriosExtra}</li>
                    <li>Roupa: {c.corRoupa}</li>
                  </ul>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowChars(false)}
              className="mt-3 w-full rounded-xl bg-gray-800 py-3 font-bold hover:bg-gray-700"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-[#0b0e14] p-4 text-center text-white sm:gap-10">
      {children}
    </main>
  );
}

function BackButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-yellow-400 ${className}`}
    >
      {"<"} VOLTAR
    </button>
  );
}
