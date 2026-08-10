import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function OnlineGameMode({ initialPlayerName, initialGuestId, onBack }: { initialPlayerName: string, initialGuestId: string, onBack: () => void }) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<string>("waiting");
  const [currentPlayerId] = useState(initialGuestId);
  const [otherPlayerName, setOtherPlayerName] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [questionAskedBy, setQuestionAskedBy] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [player1Characters, setPlayer1Characters] = useState<any[]>([]);
  const [player2Characters, setPlayer2Characters] = useState<any[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [joiningCode, setJoiningCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [playerName, setPlayerName] = useState(initialPlayerName);

  const INITIAL_CHARACTERS = [
    { id: 1, name: "Alice" }, { id: 2, name: "Bob" }, { id: 3, name: "Bernardo" }, { id: 4, name: "Caio" },
    { id: 5, name: "Helena" }, { id: 6, name: "Nathalia" }, { id: 7, name: "Gael" }, { id: 8, name: "Alice" },
    { id: 9, name: "Otavio" }, { id: 10, name: "Arthur" }, { id: 11, name: "Davi" }, { id: 12, name: "Camila" },
    { id: 13, name: "Beatriz" }, { id: 14, name: "Samuel" }, { id: 15, name: "Lara" }, { id: 16, name: "Raquel" },
    { id: 17, name: "Yuri" }, { id: 18, name: "Vicente" }, { id: 19, name: "Heitor" }, { id: 20, name: "Mayara" },
    { id: 21, name: "Enzo" }, { id: 22, name: "Isadora" }, { id: 23, name: "Lorena" }, { id: 24, name: "Tiago" }
  ];

  const createGame = async () => {
    if (!playerName.trim()) { toast.error("Digite seu nome!"); return; }
    const code = Array.from({ length: 6 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");
    const { data, error } = await supabase.from("games").insert({
      gameCode: code,
      player1Id: currentPlayerId,
      player1Name: playerName,
      gameStatus: "waiting",
      currentTurn: currentPlayerId,
      player1Characters: INITIAL_CHARACTERS,
      player2Characters: INITIAL_CHARACTERS
    }).select().single();

    if (error) { setErrorMessage("Erro ao criar sala"); return; }
    setGameId(data.id);
    setGameCode(code);
  };

  const joinGame = async (code: string) => {
    if (!playerName.trim()) { toast.error("Digite seu nome!"); return; }
    const { data, error } = await supabase.from("games").select().eq("gameCode", code.toUpperCase()).maybeSingle();
    if (error || !data) { setErrorMessage("Código inválido"); return; }
    const { error: updateError } = await supabase.from("games").update({ 
      player2Id: currentPlayerId, 
      player2Name: playerName, 
      gameStatus: "started" 
    }).eq("id", data.id);
    
    if (updateError) { setErrorMessage("Erro ao entrar na sala"); return; }
    setGameId(data.id);
  };

  const readyUp = async () => {
    if (!gameId) return;
    await supabase.from("games").update({ gameStatus: "game_running" }).eq("id", gameId);
  };

  const askQuestion = async (text: string) => {
    if (!text.trim() || !gameId) return;
    await supabase.from("games").update({ 
      currentQuestion: text, 
      questionAskedBy: currentPlayerId, 
      currentAnswer: null 
    }).eq("id", gameId);
    setQuestionInput("");
  };

  const answerQuestion = async (answer: "SIM" | "NÃO" | "SKIP") => {
    if (!gameId || !currentTurn) return;
    // Simple turn toggle for P1/P2 based on current player IDs in state
    // We need to fetch the room state to know who is who exactly if not in state
    const { data } = await supabase.from("games").select("player1Id, player2Id").eq("id", gameId).single();
    if (!data) return;
    const nextTurn = currentTurn === data.player1Id ? data.player2Id : data.player1Id;
    
    await supabase.from("games").update({ 
      currentAnswer: answer, 
      currentQuestion: null, 
      currentTurn: nextTurn 
    }).eq("id", gameId);
  };

  useEffect(() => {
    if (!gameId) return;
    
    // Initial fetch
    const fetchGame = async () => {
      const { data } = await supabase.from("games").select().eq("id", gameId).single();
      if (data) {
        setGameStatus(data.gameStatus || "waiting");
        setCurrentTurn(data.currentTurn);
        setCurrentQuestion(data.currentQuestion);
        setQuestionAskedBy(data.questionAskedBy);
        setCurrentAnswer(data.currentAnswer);
        setPlayer1Characters(data.player1Characters as any[] || []);
        setPlayer2Characters(data.player2Characters as any[] || []);
        setOtherPlayerName(currentPlayerId === data.player1Id ? data.player2Name : data.player1Name);
      }
    };
    fetchGame();

    const channel = supabase.channel("game:" + gameId).on("postgres_changes", { 
      event: "UPDATE", 
      schema: "public", 
      table: "games", 
      filter: "id=eq." + gameId 
    }, (payload) => {
      const newData = payload.new as any;
      setGameStatus(newData.gameStatus);
      setCurrentTurn(newData.currentTurn);
      setCurrentQuestion(newData.currentQuestion);
      setQuestionAskedBy(newData.questionAskedBy);
      setCurrentAnswer(newData.currentAnswer);
      setPlayer1Characters(newData.player1Characters || []);
      setPlayer2Characters(newData.player2Characters || []);
      setOtherPlayerName(currentPlayerId === newData.player1Id ? newData.player2Name : newData.player1Name);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, currentPlayerId]);

  if (gameStatus === "waiting" || gameStatus === "started") return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-6 space-y-6">
      <h1 className="text-3xl font-black italic text-yellow-400">MODO ONLINE</h1>
      
      {!gameId && (
        <div className="w-full max-w-sm space-y-4">
          <input 
            value={playerName} 
            onChange={e => setPlayerName(e.target.value)} 
            placeholder="Seu Nome"
            className="w-full bg-white/10 border border-white/20 p-3 rounded-lg text-center font-bold"
          />
          <button 
            onClick={createGame}
            className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-black uppercase tracking-widest transition-all"
          >
            CRIAR SALA
          </button>
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f172a] px-2 text-gray-500">OU</span></div>
          </div>

          <input 
            value={joiningCode} 
            onChange={e => setJoiningCode(e.target.value.toUpperCase())} 
            placeholder="CÓDIGO DA SALA"
            className="w-full bg-white/10 border border-white/20 p-3 rounded-lg text-center font-bold tracking-widest"
          />
          <button 
            onClick={() => joinGame(joiningCode)}
            className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-black uppercase tracking-widest transition-all"
          >
            ENTRAR NA SALA
          </button>
        </div>
      )}

      {gameId && (
        <div className="w-full max-w-sm bg-white/5 p-6 rounded-2xl border border-white/10 text-center space-y-6">
          <div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Código da Sala</p>
            <p className="text-4xl font-black text-yellow-400 tracking-widest">{gameCode}</p>
          </div>
          
          {gameStatus === "started" ? (
            <button 
              onClick={readyUp}
              className="w-full bg-yellow-500 text-black hover:bg-yellow-400 p-4 rounded-xl font-black uppercase tracking-widest transition-all"
            >
              ESTOU PRONTO!
            </button>
          ) : (
            <p className="text-blue-400 font-bold animate-pulse">Aguardando adversário...</p>
          )}
        </div>
      )}

      {errorMessage && <p className="text-red-500 font-bold">{errorMessage}</p>}
      <button onClick={onBack} className="text-gray-500 font-bold hover:text-white transition-colors">VOLTAR AO MENU</button>
    </div>
  );

  const myChars = currentPlayerId === "P1" ? player1Characters : player2Characters;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="bg-white/10 p-2 rounded-lg">Voltar</button>
        <div className="text-center">
          <p className="text-xs font-bold text-gray-400 uppercase">Turno de</p>
          <p className="text-xl font-black text-yellow-400 uppercase italic">
            {currentTurn === currentPlayerId ? "VOCÊ" : (otherPlayerName || "ADVERSÁRIO")}
          </p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
        {myChars.map(char => (
          <div key={char.id} className="aspect-[3/4] bg-blue-600/20 border-2 border-blue-500/50 rounded-lg flex items-center justify-center p-2 text-center text-[10px] font-bold">
            {char.name}
          </div>
        ))}
      </div>

      {currentQuestion && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-8 text-center space-y-6">
            <h3 className="text-2xl font-black italic text-yellow-400 uppercase">PERGUNTA RECEBIDA</h3>
            <p className="text-xl font-bold">"{currentQuestion}"</p>
            
            {currentTurn === currentPlayerId ? (
              <p className="text-blue-400 font-bold animate-pulse">Aguardando resposta do adversário...</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => answerQuestion("SIM")} className="bg-green-600 p-4 rounded-xl font-black">SIM</button>
                <button onClick={() => answerQuestion("NÃO")} className="bg-red-600 p-4 rounded-xl font-black">NÃO</button>
                <button onClick={() => answerQuestion("SKIP")} className="bg-gray-700 p-4 rounded-xl font-black text-xs">PULAR</button>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTurn === currentPlayerId && !currentQuestion && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md border-t border-white/10">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input 
              value={questionInput} 
              onChange={e => setQuestionInput(e.target.value)} 
              placeholder="Digite sua pergunta..."
              className="flex-1 bg-white/10 border border-white/20 p-4 rounded-xl font-bold"
            />
            <button 
              onClick={() => askQuestion(questionInput)}
              className="bg-blue-600 px-6 rounded-xl font-black uppercase tracking-widest"
            >
              ENVIAR
            </button>
          </div>
        </div>
      )}

      {currentAnswer && !currentQuestion && (
        <div className="text-center p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-xl mb-4">
          <p className="font-bold">RESPOSTA: <span className="text-yellow-400 font-black">{currentAnswer}</span></p>
        </div>
      )}
    </div>
  );
}
