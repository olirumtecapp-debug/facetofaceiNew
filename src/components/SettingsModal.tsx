import React, { useState, useEffect } from "react";
import { sounds } from "@/lib/sound";
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSoundEnabled(sounds.isEnabled());
      setPlayerName(localStorage.getItem("ftf_player_name") || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
    if (next) sounds.playClick();
  };

  const handleSaveName = (name: string) => {
    setPlayerName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem("ftf_player_name", name);
    }
  };

  const handleResetSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("ftf_guest_id");
      sessionStorage.removeItem("ftf_guest_id");
      toast.success("Sessão resetada com sucesso!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-2xl border-2 border-yellow-400/40 bg-[#0c1017] p-5 shadow-[0_0_50px_rgba(250,204,21,0.2)] sm:p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚙️</span>
            <h2 className="text-2xl font-black uppercase italic text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Configurações
            </h2>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-gray-300 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-sm text-gray-200">
          
          {/* Som e Efeitos Sonoros */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">🔊 Efeitos Sonoros</p>
              <p className="text-[11px] text-gray-400">Sons de clique, virar cartas e vitórias</p>
            </div>
            <button
              onClick={handleToggleSound}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                soundEnabled ? "bg-green-500" : "bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  soundEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Nome Padrão do Jogador */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-4">
            <p className="font-bold text-white text-sm mb-1">👤 Seu Nome de Jogador</p>
            <p className="text-[11px] text-gray-400 mb-2.5">Nome exibido nas partidas online</p>
            <input
              value={playerName}
              onChange={(e) => handleSaveName(e.target.value)}
              placeholder="Digite seu nome..."
              maxLength={20}
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-yellow-400 transition-colors"
            />
          </div>

          {/* Resetar Sessão */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">🔄 Resetar Conexão</p>
              <p className="text-[11px] text-gray-400">Gera um novo ID para testes de salas</p>
            </div>
            <button
              onClick={handleResetSession}
              className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-bold uppercase border border-gray-600 hover:bg-gray-700 active:scale-95 transition-all cursor-pointer"
            >
              Resetar
            </button>
          </div>

        </div>

        {/* Footer Button */}
        <div className="pt-5 border-t border-white/10 mt-5">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-yellow-300 active:scale-95 shadow-[0_4px_12px_rgba(250,204,21,0.3)] cursor-pointer"
          >
            SALVAR E FECHAR
          </button>
        </div>

      </div>
    </div>
  );
};
