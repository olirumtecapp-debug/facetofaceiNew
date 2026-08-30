import React from "react";
import { sounds } from "@/lib/sound";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-2xl border-2 border-blue-400/40 bg-[#0c1017] p-5 shadow-[0_0_50px_rgba(30,98,236,0.3)] sm:p-7">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📖</span>
            <h2 className="text-2xl font-black uppercase italic text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-3xl">
              Como Jogar Face to Face
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
          
          {/* Objetivo */}
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/5 p-4">
            <h3 className="text-base font-black text-yellow-400 uppercase tracking-wide mb-1 flex items-center gap-2">
              🎯 Objetivo Principal
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Descobrir o <strong>Personagem Secreto</strong> do seu adversário fazendo perguntas estratégicas de <strong>SIM ou NÃO</strong> antes que ele descubra o seu!
            </p>
          </div>

          {/* Passo a Passo */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">
              Passo a Passo da Partida:
            </h3>

            <div className="flex gap-3 rounded-xl border border-white/5 bg-black/40 p-3 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e62ec] font-black text-white text-xs">
                1
              </div>
              <div>
                <p className="font-bold text-white text-xs sm:text-sm">Receba sua Carta Secreta</p>
                <p className="text-[11px] sm:text-xs text-gray-400">
                  No início do jogo, cada jogador recebe uma carta secreta exclusiva. Ela aparece destacada no rodapé como "Sua Carta".
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-white/5 bg-black/40 p-3 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e62ec] font-black text-white text-xs">
                2
              </div>
              <div>
                <p className="font-bold text-white text-xs sm:text-sm">Faça Perguntas na sua Vez</p>
                <p className="text-[11px] sm:text-xs text-gray-400">
                  Escolha uma categoria (Cabelo, Óculos, Chapéu, Barba, etc.) e clique na pergunta. O adversário responderá em tempo real com SIM ou NÃO.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-white/5 bg-black/40 p-3 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e62ec] font-black text-white text-xs">
                3
              </div>
              <div>
                <p className="font-bold text-white text-xs sm:text-sm">Abaixe as Cartas Eliminadas</p>
                <p className="text-[11px] sm:text-xs text-gray-400">
                  Com base na resposta, clique nos personagens do seu tabuleiro para virar/abaixar as cartas dos que não correspondem à pista. Depois, clique em <strong>"Passar a vez"</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-white/5 bg-black/40 p-3 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e52e2e] font-black text-white text-xs">
                4
              </div>
              <div>
                <p className="font-bold text-white text-xs sm:text-sm">Palpite Final</p>
                <p className="text-[11px] sm:text-xs text-gray-400">
                  Quando sobrar apenas 1 personagem (ou você tiver certeza), clique em <strong>"Palpite Final"</strong> e selecione o personagem. Se acertar, você ganha a rodada! 🏆
                </p>
              </div>
            </div>
          </div>

          {/* Dicas Pro */}
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <h4 className="text-xs font-black text-green-400 uppercase tracking-wide mb-1">
              💡 Dica de Mestre:
            </h4>
            <p className="text-[11px] sm:text-xs text-gray-300">
              Faça perguntas que dividam as cartas restantes ao meio (ex: gênero ou cor de cabelo) para eliminar o maior número de cartas de uma só vez!
            </p>
          </div>

        </div>

        {/* Footer Button */}
        <div className="pt-4 border-t border-white/10 mt-2">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-full rounded-xl bg-[#1e62ec] py-3 text-sm font-black uppercase tracking-wider text-white transition-all hover:brightness-125 active:scale-95 shadow-[0_4px_12px_rgba(30,98,236,0.3)] cursor-pointer"
          >
            ENTENDI, VAMOS JOGAR!
          </button>
        </div>

      </div>
    </div>
  );
};
