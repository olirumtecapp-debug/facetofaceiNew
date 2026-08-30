import { sounds } from "@/lib/sound";
import { useState, useMemo, useEffect } from "react";
import { CHARACTERS } from "@/data/characters";
import { QUESTIONS } from "@/data/questions";
import { useGameState } from "@/hooks/use-game-state";
import { GameCard } from "@/components/GameCard";
import { Difficulty, getAIResponse } from "@/lib/ai-logic";

interface GameBoardProps {
  playerColor: "AZUL" | "VERMELHO";
  difficulty: Difficulty;
  onBack: () => void;
}

const CATEGORIES = ["Gênero", "Cabelo", "Olhos & Rosto", "Acessórios", "Barba e Bigode", "Pele & Detalhes"];

export const GameBoard = ({ playerColor, difficulty, onBack, initialRoomCode }: GameBoardProps & { initialRoomCode?: string }) => {
  const { gameState, handlePlayerQuestion, toggleCard, playerPalpite, passTurn, rematch, answerQuestion, revealAIAnswer, guestId, abandon } = useGameState(
    playerColor,
    difficulty,
    initialRoomCode
  );
  const [isPalpitando, setIsPalpitando] = useState(false);
  const [cat, setCat] = useState(CATEGORIES[1]!);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(45);

  // Remaining cards count
  const remainingCardsCount = useMemo(() => {
    return gameState.playerBoard ? gameState.playerBoard.filter(c => !c.isDown).length : 0;
  }, [gameState.playerBoard]);

  // Turn timer for online matches
  useEffect(() => {
    if (gameState.gameMode !== "ONLINE" || gameState.isGameOver) return;
    setTurnTimeLeft(45);
    const interval = setInterval(() => {
      setTurnTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.phase, gameState.currentTurn, gameState.gameMode, gameState.isGameOver]);

  // Monitor connection timeout
  useState(() => {
    const checkTimeout = setInterval(() => {
      if (gameState.gameMode === "ONLINE" && !gameState.isGameOver && gameState.lastActionTime) {
        const secondsSinceLastAction = (Date.now() - gameState.lastActionTime) / 1000;
        // If waiting for answer or turn for more than 20 seconds, show warning
        const isWaiting = gameState.phase === "WAITING_ANSWER" || 
                         (gameState.currentTurn === "AI" && gameState.phase === "AI_TURN");
        
        if (isWaiting && secondsSinceLastAction > 20) {
          setShowTimeoutWarning(true);
        } else {
          setShowTimeoutWarning(false);
        }
      }
    }, 5000);
    return () => clearInterval(checkTimeout);
  });

  const myTurn = gameState.currentTurn === "PLAYER" && !gameState.isGameOver;
  const canAsk = myTurn && gameState.phase === "PLAYER_TURN";
  const canPass = myTurn && (gameState.phase === "PLAYER_DISCARDING" || gameState.phase === "PLAYER_TURN");
  const canPalpite = myTurn && gameState.phase === "PLAYER_TURN";
  const oppColor = playerColor === "AZUL" ? "VERMELHO" : "AZUL";

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-main-gradient text-white">
      {/* Game Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Rotating Lightning/Energy effect for game screen */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180vmax] h-[180vmax] animate-lightning-spin opacity-20 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_40deg,#1e62ec_45deg,transparent_50deg,transparent_90deg,transparent_130deg,#e52e2e_135deg,transparent_140deg,transparent_180deg,transparent_220deg,#1e62ec_225deg,transparent_230deg,transparent_270deg,transparent_310deg,#e52e2e_315deg,transparent_320deg,transparent_360deg)] blur-2xl" />
        
        {/* Glow Pulses for game screen */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(30,98,236,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(229,46,46,0.15),transparent_50%)] animate-pulse-glow" />
        
        {/* Subtle Grid overlay */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 bg-[#0b0e14]/80 backdrop-blur-md px-3 py-2">
        <button
          onClick={() => {
            if (!gameState.isGameOver) {
              setShowExitConfirm(true);
            } else {
              onBack();
            }
          }}
          className="group flex items-center gap-1.5 rounded-lg border-2 border-gray-400/30 bg-gray-800/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all hover:border-yellow-400/50 hover:text-yellow-400 hover:scale-105 active:scale-95"
        >
          <span className="text-sm">{"<"}</span> <span translate="no">VOLTAR{" "}AO{" "}MENU</span>
        </button>
        <div className="flex min-w-0 flex-col items-center justify-center leading-tight">
          <div className={`text-[10px] font-black uppercase tracking-[0.15em] drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] sm:text-xs px-3 py-0.5 rounded-full ${
            gameState.isGameOver ? "text-yellow-400" :
            gameState.phase === "PLAYER_TURN" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
            gameState.phase === "PLAYER_RESPONDING" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
            "bg-orange-500/20 text-orange-400 border border-orange-500/30"
          }`}>
            {gameState.isGameOver ? "FIM DE PARTIDA" : 
             gameState.phase === "PLAYER_TURN" ? "🟢 SUA VEZ: Faça uma pergunta" :
             gameState.phase === "WAITING_ANSWER" ? (gameState.gameMode === "ONLINE" ? `🟠 Aguardando ${gameState.opponentName || "adversário"} responder...` : "Aguardando resposta da IA...") :
             gameState.phase === "PLAYER_DISCARDING" ? "🟢 SUA VEZ: Descarte e passe a vez" :
             gameState.phase === "AI_TURN" ? (gameState.gameMode === "ONLINE" ? `🟠 VEZ DE ${gameState.opponentName || "ADVERSÁRIO"}...` : "Turno da IA: Pensando...") :
             gameState.phase === "PLAYER_RESPONDING" ? (gameState.gameMode === "ONLINE" ? `🔵 RESPONDA A ${gameState.opponentName || "ADVERSÁRIO"}` : "🔵 RESPONDA À IA") :
             gameState.phase === "AI_DISCARDING" ? (gameState.gameMode === "ONLINE" ? `${gameState.opponentName || "Adversário"} está descartando...` : "IA está analisando a resposta...") :
             "Aguarde o adversário"}
          </div>
          <div className="text-[9px] font-bold text-gray-500 sm:text-[10px]">
            Rodada {gameState.turnCount} {gameState.gameMode === "IA" ? `· IA` : "· MULTIPLAYER ONLINE"}
          </div>
          {showTimeoutWarning && (
            <div className="absolute top-full mt-2 w-max animate-bounce rounded bg-red-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg backdrop-blur-sm">
              ⚠️ Conexão lenta? Aguardando resposta...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-sm font-black">
          <span className="text-[#1e62ec]">{gameState.playerScore}</span>
          <span className="text-gray-600">×</span>
          <span className="text-[#e52e2e]">{gameState.aiScore}</span>
        </div>
      </header>
      {/* Online Turn Timer Bar */}
      {gameState.gameMode === "ONLINE" && !gameState.isGameOver && (
        <div className="w-full bg-black/40 h-1 px-4">
          <div
            className={`h-full transition-all duration-1000 ${
              turnTimeLeft <= 10 ? "bg-red-500 animate-pulse" : "bg-yellow-400"
            }`}
            style={{ width: `${(turnTimeLeft / 45) * 100}%` }}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1 lg:flex-row lg:gap-2 lg:p-2">
        {/* Board */}
        <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/5 bg-black/20 p-1 flex items-start justify-center">
          <div className="w-full h-full flex items-start justify-center overflow-auto custom-scrollbar">
            <table className="border-separate border-spacing-[1px] sm:border-spacing-1 w-full max-w-4xl">
              <tbody className="h-full">
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="h-1/4">
                    {Array.from({ length: 6 }).map((_, colIndex) => {
                      const charIndex = rowIndex * 6 + colIndex;
                      const item = gameState.playerBoard[charIndex];
                      return (
                        <td key={colIndex} className="p-0 align-middle text-center w-1/6 h-full">
                          {item && (
                            <div className="flex flex-col items-center">
                              <GameCard
                                character={item.character}
                                isDown={item.isDown}
                                color={playerColor}
                                onClick={() => toggleCard(item.character.id)}
                              />
                              <span className={`mt-0.5 text-[8px] font-black uppercase italic tracking-tighter sm:text-[9px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${item.isDown ? 'text-gray-500' : 'text-white'}`}>
                                {item.character.nome}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Side panel */}
        <aside className="flex min-h-0 shrink-0 flex-col gap-1 lg:w-[320px] max-h-[45vh] lg:max-h-none">
          {/* Secret cards + actions */}
          <div className="flex shrink-0 gap-2 rounded-xl border border-white/10 bg-[#0b0e14] p-2 sm:gap-3">
            <div className="w-12 shrink-0 sm:w-20">
              <div className="mb-0.5 text-center text-[7px] font-black uppercase tracking-tight text-gray-500 sm:mb-1 sm:text-[8px]">
                Sua carta
              </div>
              <GameCard character={gameState.playerSecret} isDown={false} color={playerColor} onClick={() => {}} />
              <div className={`mt-1 text-center text-[8px] font-black uppercase tracking-tight px-1 py-0.5 rounded ${
                remainingCardsCount === 1 ? "bg-yellow-400 text-black animate-bounce font-black" : "bg-white/10 text-gray-300"
              }`}>
                Restam: {remainingCardsCount}
              </div>
            </div>
            <div className="w-12 shrink-0 sm:w-20">
              <div className="mb-0.5 text-center text-[7px] font-black uppercase tracking-tight text-gray-500 sm:mb-1 sm:text-[8px]">
                {gameState.gameMode === "ONLINE" ? (gameState.opponentName || "Adversário") : "IA"}
              </div>
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border-2 border-dashed border-white/15 bg-black/40 text-xl sm:text-2xl">
                ❓
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setIsPalpitando(true)}
                disabled={!canPalpite}
                className="flex items-center justify-center rounded-lg bg-[#e52e2e] px-2 py-2.5 text-[10px] font-black uppercase tracking-wider border-2 border-[#ff4444]/50 shadow-[0_0_10px_rgba(229,46,46,0.3)] transition-all hover:bg-red-700 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 sm:text-[11px]"
              >
                Palpite final
              </button>
              <button
                onClick={passTurn}
                disabled={!canPass}
                className="flex items-center justify-center rounded-lg bg-gray-700 px-2 py-2.5 text-[10px] font-black uppercase tracking-wider border-2 border-gray-500/50 transition-all hover:bg-gray-600 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 sm:text-[11px]"
              >
                Passar a vez
              </button>
            </div>
          </div>



          {/* History */}
          <div className="flex min-h-[60px] flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b0e14]">
            <div className="border-b border-white/10 p-1.5 text-[10px] font-black uppercase tracking-tight text-gray-500">
              Histórico
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2 text-[11px] custom-scrollbar max-h-[120px] sm:max-h-none">
              {gameState.history.length === 0 && (
                <p className="text-center text-[10px] text-gray-600">Faça sua primeira pergunta.</p>
              )}
              {gameState.history.map((h, i) => (
                <div key={i} className={`flex flex-col ${h.type === "PLAYER" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-lg px-2 py-1 ${h.type === "PLAYER" ? "bg-[#1e62ec]/80" : "bg-gray-700/80"}`}
                  >
                    {h.text}
                  </div>
                  {h.answer && (
                    <div
                      className={`mt-0.5 px-1 text-[10px] font-black ${h.answer === "SIM" ? "text-green-400" : "text-red-400"}`}
                    >
                      {h.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="shrink-0 rounded-xl border border-white/10 bg-[#0b0e14] p-1.5">
            <div key={`cat-selector-${gameState.myAskedQuestions.size}`} className="mb-1 flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase transition-colors sm:px-2 sm:py-1 sm:text-[9px] ${
                    cat === c ? "bg-yellow-400 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto custom-scrollbar sm:max-h-24">
              {QUESTIONS.filter((q) => q.category === cat).map((q) => {
                const isLocked = q.category === "Gênero" ? (gameState.myAskedQuestions.size < 2) : false;
                const isAlreadyAsked = gameState.gameMode === "ONLINE" ? gameState.myAskedQuestions.has(q.id) : gameState.askedQuestions.has(q.id);
                return (
                  <button
                    key={q.id}
                    disabled={!canAsk || isLocked || isAlreadyAsked}
                    onClick={() => handlePlayerQuestion(q)}
                    className={`rounded border border-white/5 bg-gray-800/60 px-1.5 py-0.5 text-[9px] font-medium transition-colors sm:px-2 sm:py-1 sm:text-[10px] ${
                      isLocked ? "opacity-20 cursor-not-allowed grayscale" : "hover:bg-gray-700"
                    } ${isAlreadyAsked ? "opacity-30" : ""}`}
                  >
                    {isLocked ? "🔒 " : ""}{q.text}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Palpite modal */}
      {isPalpitando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b0e14] p-4 sm:p-6 lg:max-w-3xl">
            <h2 className="mb-4 text-center text-2xl font-black italic text-[#e52e2e] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-3xl">
              QUEM É O PERSONAGEM?
            </h2>
            <div className="mb-4 grid max-h-[50vh] grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 items-start justify-items-center overflow-y-auto custom-scrollbar p-2">
              {gameState.playerBoard
                .filter(item => !item.isDown)
                .map((item) => (
                  <div key={item.character.id} className="w-full max-w-[120px]">
                    <GameCard
                      character={item.character}
                      isDown={false}
                      color={oppColor}
                      onClick={() => {
                        setIsPalpitando(false);
                        playerPalpite(item.character);
                      }}
                    />
                  </div>
                ))}
              {gameState.playerBoard.filter(item => !item.isDown).length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-500 italic">
                  Nenhum personagem disponível para palpite.
                </div>
              )}
            </div>
            <button
              onClick={() => setIsPalpitando(false)}
              className="w-full rounded-xl border-2 border-gray-500/50 bg-gray-800 py-3 font-bold transition-all hover:bg-gray-700 hover:scale-[1.02] active:scale-95"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {/* Game over */}
      {gameState.isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
          <div className="text-center max-w-lg">
            {gameState.matchWinnerId && (
              <div className="mb-6 animate-bounce text-2xl font-black text-yellow-400 sm:text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                🏆 CONFRONTO ENCERRADO! 🏆
              </div>
            )}
            
            <h2
              className={`mb-2 text-4xl font-black italic drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] sm:text-6xl ${
                gameState.winner === "PLAYER" || gameState.winner === "WINNER" ? "text-green-500" : "text-[#e52e2e]"
              }`}
            >
              {gameState.matchWinnerId 
                ? (gameState.matchWinnerId === gameState.guestId ? "VOCÊ VENCEU O CONFRONTO!" : "VOCÊ PERDEU O CONFRONTO")
                : (gameState.winner === "PLAYER" || gameState.winner === "WINNER" ? "VOCÊ VENCEU!" : "VOCÊ PERDEU!")
              }
            </h2>

            <div className="mb-6 flex items-center justify-center gap-4 text-2xl font-black">
              <span className="text-[#1e62ec]">{gameState.playerColor === "AZUL" ? gameState.playerName || "VOCÊ" : gameState.opponentName || "OPONENTE"} {gameState.playerScore}</span>
              <span className="text-gray-500">×</span>
              <span className="text-[#e52e2e]">{gameState.playerColor === "VERMELHO" ? gameState.playerName || "VOCÊ" : gameState.opponentName || "OPONENTE"} {gameState.aiScore}</span>
            </div>

            <p className="mb-8 text-lg text-gray-300">
              O personagem do {gameState.gameMode === "ONLINE" ? (gameState.opponentName || "adversário") : "IA"} era <span className="font-bold text-white">{gameState.aiSecret.nome}</span>
            </p>

            {gameState.gameMode === "ONLINE" && !gameState.matchWinnerId && (
              <div className="mb-8">
                {gameState.winner === "LOSER" ? (
                  gameState.rematchStatus === "requested" ? (
                    <p className="animate-pulse font-bold text-yellow-400">Aguardando resposta de {gameState.opponentName}...</p>
                  ) : (
                    <button
                      onClick={async () => {
                        const { requestRematch } = await import("@/lib/online.functions");
                        await requestRematch({ data: { roomId: gameState.roomId || "", guestId: gameState.guestId } });
                      }}
                      className="rounded-full border-2 border-yellow-500/50 bg-yellow-400 px-10 py-4 text-xl font-black text-black transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] active:scale-95"
                    >
                      PEDIR REVANCHE
                    </button>
                  )
                ) : (
                  gameState.rematchStatus === "requested" ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                      <p className="mb-4 text-lg font-black uppercase tracking-widest text-yellow-400">
                        {gameState.opponentName} QUER UMA REVANCHE. VOCÊ ACEITA?
                      </p>
                      <div className="flex gap-4">
                        <button
                          onClick={async () => {
                            const { handleRematchResponse } = await import("@/lib/online.functions");
                            await handleRematchResponse({ data: { roomId: gameState.roomId || "", guestId: gameState.guestId, accept: true } });
                          }}
                          className="flex-1 rounded-lg bg-green-500 py-3 font-black text-white transition-all hover:bg-green-600 active:scale-95"
                        >
                          ACEITAR
                        </button>
                        <button
                          onClick={async () => {
                            const { handleRematchResponse } = await import("@/lib/online.functions");
                            await handleRematchResponse({ data: { roomId: gameState.roomId || "", guestId: gameState.guestId, accept: false } });
                          }}
                          className="flex-1 rounded-lg bg-red-500 py-3 font-black text-white transition-all hover:bg-red-600 active:scale-95"
                        >
                          RECUSAR
                        </button>
                      </div>
                    </div>
                  ) : (
                    gameState.rematchStatus !== "declined" && (
                      <p className="font-bold text-gray-400 italic">Aguardando solicitação de revanche de {gameState.opponentName}...</p>
                    )
                  )
                )}
                
                {gameState.rematchStatus === "declined" && (
                  <div className="mt-4 animate-in fade-in zoom-in-95">
                    <p className="font-bold text-red-400 uppercase tracking-widest">
                      REVANCHE RECUSADA.
                    </p>
                    <p className="mt-2 text-sm italic text-gray-400">
                      "Seu adversário decidiu parar por aqui. Parece que a revanche ficou para a próxima! 😏"
                    </p>
                    <p className="mt-4 font-black text-white uppercase tracking-tighter">Partida encerrada.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {gameState.gameMode !== "ONLINE" && !gameState.matchWinnerId && (
                <button
                  onClick={rematch}
                  className="rounded-full border-2 border-yellow-500/50 bg-yellow-400 px-10 py-4 text-xl font-black text-black transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] active:scale-95"
                >
                  {gameState.winner === "PLAYER" ? "JOGAR NOVAMENTE" : "REVANCHE"}
                </button>
              )}
              <button
                onClick={onBack}
                className="rounded-full border-2 border-gray-500/50 bg-gray-800 px-10 py-4 text-xl font-black transition-all hover:scale-110 active:scale-95"
              >
                <span translate="no">VOLTAR{" "}AO{" "}MENU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-lg">
          <div className="w-full max-w-sm rounded-2xl border-2 border-white/10 bg-[#0b0e14] p-8 text-center shadow-[0_0_50px_rgba(229,46,46,0.2)]">
            <h3 className="mb-4 text-2xl font-black text-[#e52e2e] uppercase italic">ABANDONAR PARTIDA?</h3>
            <p className="mb-8 text-gray-400 font-bold leading-tight">
              Tem certeza que deseja sair?<br/>
              <span className="text-red-500">Abandonar a partida fará você perder o jogo.</span>
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full rounded-xl bg-gray-700 py-4 font-black text-white transition-all hover:bg-gray-600 active:scale-95"
              >
                CONTINUAR JOGANDO
              </button>
              <button
                disabled={isAbandoning}
                onClick={async () => {
                  setIsAbandoning(true);
                  await abandon();
                  setShowExitConfirm(false);
                  setIsAbandoning(false);
                }}
                className="w-full rounded-xl bg-[#e52e2e] py-4 font-black text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
              >
                {isAbandoning ? "SAINDO..." : "ABANDONAR E PERDER"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Interativo Modal de Pergunta */}
      {gameState.pendingQuestion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="w-full max-w-[90%] sm:max-w-md overflow-hidden rounded-2xl border-2 border-white/10 bg-[#0b0e14] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className={`p-1 text-center text-[10px] font-black uppercase tracking-[0.2em] ${gameState.pendingQuestion.type === "PLAYER" ? "bg-[#1e62ec] text-white" : "bg-[#e52e2e] text-white"}`}>
              {gameState.pendingQuestion.type === "PLAYER" ? "Sua Pergunta" : gameState.pendingQuestion.type === "AI_PALPITE" ? (gameState.gameMode === "ONLINE" ? `PALPITE DE ${gameState.opponentName || "ADVERSÁRIO"}` : "PALPITE DA IA") : (gameState.gameMode === "ONLINE" ? `PERGUNTA DE ${gameState.opponentName || "ADVERSÁRIO"}` : "Pergunta da IA")}
            </div>
            
            <div className="flex flex-col items-center p-6 sm:p-8">
              <div className="mb-6 w-full text-center text-lg font-bold italic leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] sm:text-2xl">
                "{gameState.pendingQuestion.question.text}"
              </div>

              {gameState.pendingQuestion.type === "PLAYER" ? (
                <div className="flex flex-col gap-6">
                  {gameState.pendingQuestion.revealedAnswer ? (
                    <div className="flex w-full flex-col items-center gap-5 animate-in zoom-in-95 duration-300">
                      <div className={`text-5xl font-black italic tracking-tighter sm:text-6xl ${gameState.pendingQuestion.revealedAnswer === "SIM" ? "text-green-500" : "text-red-500"}`}>
                        {gameState.pendingQuestion.revealedAnswer}
                      </div>
                      <div className="flex w-full flex-col gap-2">
                        <div className="text-center text-xs font-bold text-gray-400 sm:text-sm">
                          {gameState.pendingQuestion.revealedAnswer === "SIM" 
                            ? "Descarte quem NÃO tem essa característica!" 
                            : "Descarte quem TEM essa característica!"}
                        </div>
                        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-2.5 text-[9px] font-bold text-yellow-500 animate-pulse uppercase tracking-wider leading-tight sm:p-3 sm:text-[10px]">
                          NÃO ESQUEÇA DE DESCARTAR OS PERSONAGENS ANTES DE FAZER UMA NOVA PERGUNTA!
                        </div>
                      </div>
                      <button
                        onClick={() => answerQuestion(gameState.pendingQuestion!.revealedAnswer!)}
                        className="w-full rounded-xl bg-[#1e62ec] py-3 text-base font-black text-white transition-all hover:scale-[1.02] active:scale-95 shadow-[0_4px_12px_rgba(30,98,236,0.3)] sm:py-4 sm:text-lg"
                      >
                        ENTENDI, CONTINUAR
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {gameState.gameMode === "ONLINE" ? "Personagem do Adversário" : "Personagem da IA"}
                        </div>
                        <div className="w-24">
                          <div className="flex aspect-[3/4] items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-black/40 text-4xl">
                            ❓
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex w-full flex-col gap-4">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 animate-pulse sm:text-sm">
                          {gameState.gameMode === "ONLINE" ? "Aguardando resposta..." : "IA está respondendo..."}
                        </div>
                        {gameState.gameMode !== "ONLINE" && (
                          <button
                            onClick={revealAIAnswer}
                            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-base font-black text-black transition-all hover:scale-[1.02] active:scale-95 sm:py-4 sm:text-lg"
                          >
                            VER RESPOSTA
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sua Carta</div>
                    <div className="w-24 overflow-hidden rounded-lg border-2 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                      <GameCard character={gameState.playerSecret} isDown={false} color={playerColor} onClick={() => {}} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => answerQuestion("SIM")}
                        className="group relative overflow-hidden rounded-xl border-2 border-green-500/50 bg-green-600 px-6 py-3 text-lg font-black text-white transition-all hover:bg-green-500 hover:scale-[1.02] active:scale-95 shadow-[0_4px_10px_rgba(22,163,74,0.3)]"
                      >
                        SIM
                      </button>
                      <button
                        onClick={() => answerQuestion("NÃO")}
                        className="group relative overflow-hidden rounded-xl border-2 border-red-500/50 bg-red-600 px-6 py-3 text-lg font-black text-white transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-95 shadow-[0_4px_10px_rgba(220,38,38,0.3)]"
                      >
                        NÃO
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white/5 p-4 text-center">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                {gameState.pendingQuestion.type === "PLAYER" 
                  ? (gameState.gameMode === "ONLINE" ? "Seu adversário responderá em tempo real" : "A IA vai responder com base no personagem dela") 
                  : "Responda honestamente sobre o seu personagem"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
