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
    <button
      type="button"
      onClick={onClick}
      className={`relative flex aspect-[3/4] w-full items-center justify-center p-[3px] transition-all duration-200 ${
        isDown ? "opacity-25 grayscale" : "opacity-100 hover:scale-[1.04]"
      }`}
    >
      <img
        src={src}
        alt={character.nome}
        loading="lazy"
        className="h-full w-full object-contain object-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      />
      {isDown && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-[70%] w-[3px] rotate-45 rounded bg-red-500/70" />
          <span className="absolute h-[70%] w-[3px] -rotate-45 rounded bg-red-500/70" />
        </span>
      )}
    </button>
  );
};
