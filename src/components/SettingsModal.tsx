import React, { useState, useEffect } from "react";
import { sounds, RELAX_TRACKS } from "@/lib/sound";
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [currentTrackId, setCurrentTrackId] = useState(0);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMusicEnabled(sounds.isMusicEnabled());
      setMusicVolume(sounds.getMusicVolume());
      setSfxEnabled(sounds.isSfxEnabled());
      setCurrentTrackId(sounds.getCurrentTrack().id);
      setPlayerName(localStorage.getItem("ftf_player_name") || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMusic = () => {
    const next = !musicEnabled;
    setMusicEnabled(next);
    sounds.setMusicEnabled(next);
    sounds.playClick();
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    sounds.setSfxEnabled(next);
    if (next) sounds.playClick();
  };

  const handleSelectTrack = (trackId: number) => {
    setCurrentTrackId(trackId);
    sounds.setTrack(trackId);
    sounds.playClick();
  };

  const handleVolumeChange = (vol: number) => {
    setMusicVolume(vol);
    sounds.setMusicVolume(vol);
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
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-2xl border-2 border-yellow-400/40 bg-[#0c1017] p-5 shadow-[0_0_50px_rgba(250,204,21,0.2)] sm:p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
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
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm custom-scrollbar text-gray-200">
          
          {/* JUKEBOX: Músicas Relaxantes Gravadas */}
          <div className="rounded-xl border border-yellow-400/25 bg-yellow-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-yellow-400 text-sm flex items-center gap-2">
                  <span>🎵</span> Jukebox de Músicas Relaxantes
                </p>
                <p className="text-[11px] text-gray-400">Trilhas acústicas e relaxantes gravadas</p>
              </div>
              <button
                onClick={handleToggleMusic}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  musicEnabled ? "bg-green-500" : "bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    musicEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Volume da Música */}
            {musicEnabled && (
              <div className="pt-1 flex items-center gap-3">
                <span className="text-xs text-gray-400">Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 accent-yellow-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-bold text-yellow-400 w-8 text-right">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
            )}

            {/* Lista de Faixas Relaxantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {RELAX_TRACKS.map((t) => {
                const isSelected = t.id === currentTrackId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTrack(t.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-yellow-400/15 border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                        : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60"
                    }`}
                  >
                    <span className="text-xl shrink-0">{t.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-black truncate ${isSelected ? "text-yellow-300" : "text-white"}`}>
                        {t.title}
                      </p>
                      <p className="text-[9px] text-gray-400 truncate leading-tight">
                        {t.subtitle}
                      </p>
                    </div>
                    {isSelected && musicEnabled && (
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-ping shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Efeitos Sonoros */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">🔊 Efeitos Sonoros</p>
              <p className="text-[11px] text-gray-400">Sons de clique, virar cartas e vitórias</p>
            </div>
            <button
              onClick={handleToggleSfx}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                sfxEnabled ? "bg-green-500" : "bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  sfxEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Nome Padrão do Jogador */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5">
            <p className="font-bold text-white text-sm mb-0.5">👤 Seu Nome de Jogador</p>
            <p className="text-[11px] text-gray-400 mb-2">Nome exibido nas partidas online</p>
            <input
              value={playerName}
              onChange={(e) => handleSaveName(e.target.value)}
              placeholder="Digite seu nome..."
              maxLength={20}
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm font-bold text-white outline-none focus:border-yellow-400 transition-colors"
            />
          </div>

          {/* Resetar Sessão */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">🔄 Resetar Conexão</p>
              <p className="text-[11px] text-gray-400">Gera um novo ID para testes de salas</p>
            </div>
            <button
              onClick={handleResetSession}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-bold uppercase border border-gray-600 hover:bg-gray-700 active:scale-95 transition-all cursor-pointer"
            >
              Resetar
            </button>
          </div>

        </div>

        {/* Footer Button */}
        <div className="pt-4 border-t border-white/10 mt-3">
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
