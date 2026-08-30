import { Character } from "@/data/characters";
import { CARD_IMAGES } from "@/assets/chars";

interface CardProps {
  character: Character;
  isDown: boolean;
  color: "AZUL" | "VERMELHO";
  onClick: () => void;
  isSecret?: boolean;
}

export const GameCard = ({ character, isDown, color, onClick }: CardProps) => {
  const src = CARD_IMAGES[color][character.id - 1];

  return (
    <div className="flex h-full w-full items-center justify-center p-0 [perspective:600px]">
      <button
        type="button"
        onClick={onClick}
        className={`relative flex aspect-[3/4] h-auto w-full items-center justify-center overflow-hidden rounded-md border-[1.5px] border-[#d4af37] bg-gray-200 p-0 transition-all duration-300 transform-gpu cursor-pointer origin-bottom shadow-md ${
          isDown
            ? "[transform:rotateX(68deg)_scale(0.85)_translateY(4px)] opacity-30 grayscale brightness-75 shadow-inner"
            : "[transform:rotateX(0deg)] opacity-100 hover:scale-[1.05] hover:shadow-[0_4px_16px_rgba(212,175,55,0.4)]"
        }`}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden bg-gray-200 p-0.5 sm:p-0.5">
          <img
            src={src}
            alt={character.nome}
            loading="lazy"
            className="h-full w-full object-contain object-center contrast-110"
          />
        </div>
        {isDown && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-[80%] w-[2px] rotate-45 rounded bg-red-500/80" />
            <span className="absolute h-[80%] w-[2px] -rotate-45 rounded bg-red-500/80" />
          </span>
        )}
      </button>
    </div>
  );
};
