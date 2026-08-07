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
    <div className="flex h-full w-full items-center justify-center p-0">
      <button
        type="button"
        onClick={onClick}
        className={`relative flex aspect-[178/224] h-auto w-full items-center justify-center overflow-hidden rounded-md border-[1.5px] border-[#d4af37] bg-[#c0c0c0] p-0 transition-all duration-200 ${
          isDown ? "opacity-30 grayscale" : "opacity-100 hover:scale-[1.04]"
        }`}
      >
        <img
          src={src}
          alt={character.nome}
          loading="lazy"
          className="h-full w-full object-cover object-center"
        />
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
