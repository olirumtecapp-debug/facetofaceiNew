import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function OnlineGameMode({ player1Name, initialGuestId, onBack }: { player1Name: string, initialGuestId: string, onBack: () => void }) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<"waiting" | "started" | "game_running" | "finished">("waiting");
  const [currentPlayerId] = useState(initialGuestId);
  const [otherPlayerId, setOtherPlayerId] = useState<string | null>(null);
  const [otherPlayerName, setOtherPlayerName] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [questionAskedBy, setQuestionAskedBy] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [player1Characters, setPlayer1Characters] = useState<any[]>([]);
  const [player2Characters, setPlayer2Characters] = useState<any[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [joiningCode, setJoiningCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const INITIAL_CHARACTERS = [
    { id: 1, name: "Alice" }, { id: 2, name: "Bob" }, { id: 3, name: "Bernardo" }, { id: 4, name: "Caio" },
    { id: 5, name: "Helena" }, { id: 6, name: "Nathalia" }, { id: 7, name: "Gael" }, { id: 8, name: "Alice" },
    { id: 9, name: "Otavio" }, { id: 10, name: "Arthur" }, { id: 11, name: "Davi" }, { id: 12, name: "Camila" },
    { id: 13, name: "Beatriz" }, { id: 14, name: "Samuel" }, { id: 15, name: "Lara" }, { id: 16, name: "Raquel" },
    { id: 17, name: "Yuri" }, { id: 18, name: "Vicente" }, { id: 19, name: "Heitor" }, { id: 20, name: "Mayara" },
    { id: 21, name: "Enzo" }, { id: 22, name: "Isadora" }, { id: 23, name: "Lorena" }, { id: 24, name: "Tiago" }
  ];

  const createGame = async () => {
    setIsCreatingGame(true);
    const code = Array.from({ length: 6 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");
    const { data, error } = await supabase.from("games").insert({
      gameCode: code,
      player1Id: currentPlayerId,
      player1Name: player1Name,
      gameStatus: "waiting",
      currentTurn: currentPlayerId,
      player1Characters: INITIAL_CHARACTERS,
      player2Characters: INITIAL_CHARACTERS
    }).select().single();

    if (error) { setErrorMessage("Erro ao criar sala"); setIsCreatingGame(false); return; }
    setGameId(data.id);
    setGameCode(code);
    setIsCreatingGame(false);
  };

  const joinGame = async (code: string) => {
    const { data, error } = await supabase.from("games").select().eq("gameCode", code.toUpperCase()).maybeSingle();
    if (error || !data) { setErrorMessage("Código inválido"); return; }
    await supabase.from("games").update({ player2Id: currentPlayerId, player2Name: player1Name, gameStatus: "started" }).eq("id", data.id);
    setGameId(data.id);
  };

  const readyUp = async () => {
    await supabase.from("games").update({ gameStatus: "game_running" }).eq("id", gameId);
  };

  const askQuestion = async (text: string) => {
    if (!text.trim()) return;
    await supabase.from("games").update({ currentQuestion: text, questionAskedBy: currentPlayerId, currentAnswer: null }).eq("id", gameId);
    setQuestionInput("");
  };

  const answerQuestion = async (answer: "SIM" | "NÃO" | "SKIP") => {
    const nextTurn = currentTurn === currentPlayerId ? (currentPlayerId === "P1" ? "P2" : "P1") : currentPlayerId;
    await supabase.from("games").update({ currentAnswer: answer, currentQuestion: null, currentTurn: nextTurn }).eq("id", gameId);
  };

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel("game:" + gameId).on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: "id=eq." + gameId }, (payload) => {
      setGameStatus(payload.new.gameStatus);
      setCurrentTurn(payload.new.currentTurn);
      setCurrentQuestion(payload.new.currentQuestion);
      setQuestionAskedBy(payload.new.questionAskedBy);
      setCurrentAnswer(payload.new.currentAnswer);
      setPlayer1Characters(payload.new.player1Characters);
      setPlayer2Characters(payload.new.player2Characters);
      setOtherPlayerId(currentPlayerId === payload.new.player1Id ? payload.new.player2Id : payload.new.player1Id);
      setOtherPlayerName(currentPlayerId === payload.new.player1Id ? payload.new.player2Name : payload.new.player1Name);
    }).subscribe();
    return () => { channel.unsubscribe(); };
  }, [gameId, currentPlayerId]);

  if (gameStatus === "waiting") return (
    <div className="container p-4 text-white">
      <h1>Face to Face - Online</h1>
      {!gameCode ? <button onClick={createGame}>Criar Sala</button> : <p>Código: {gameCode}</p>}
      {!gameId && <input value={joiningCode} onChange={e => setJoiningCode(e.target.value)} placeholder="Código..." />}
      {!gameId && <button onClick={() => joinGame(joiningCode)}>Entrar</button>}
    </div>
  );

  return (
    <div className="container p-4 text-white">
      <h2>Turno: {currentTurn === currentPlayerId ? "Você" : otherPlayerName}</h2>
      {currentQuestion && currentTurn !== currentPlayerId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
            <p>"{currentQuestion}"</p>
            <button onClick={() => answerQuestion("SIM")}>SIM</button>
            <button onClick={() => answerQuestion("NÃO")}>NÃO</button>
        </div>
      )}
      {currentTurn === currentPlayerId && !currentQuestion && (
        <input value={questionInput} onChange={e => setQuestionInput(e.target.value)} />
      )}
      {currentTurn === currentPlayerId && !currentQuestion && <button onClick={() => askQuestion(questionInput)}>Enviar</button>}
    </div>
  );
}
