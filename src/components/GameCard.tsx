import { Character } from "@/data/characters";
import cardsAzulAsset from "@/assets/CardsAzul.png.asset.json";
import cardsVermelhoAsset from "@/assets/CardsVermelho.png.asset.json";

interface CardProps {
  character: Character;
  isDown: boolean;
  color: "AZUL" | "VERMELHO";
  onClick: () => void;
  isSecret?: boolean;
}

export const GameCard = ({ character, isDown, color, onClick, isSecret }: CardProps) => {
  // We use the full sprite sheet and calculate offsets
  // The images are 6x4 grids.
  const cols = 6;
  const rows = 4;
  const index = character.id - 1;
  const x = (index % cols) * (100 / (cols - 1));
  const y = Math.floor(index / cols) * (100 / (rows - 1));

  const spriteSheet = color === "AZUL" ? cardsAzulAsset.url : cardsVermelhoAsset.url;

  return (
    <div 
      className={`relative aspect-[3/4] cursor-pointer transition-all duration-500 [preserve-style:preserve-3d] ${isDown ? "[transform:rotateX(-180deg)]" : ""}`}
      onClick={onClick}
    >
      {/* Front */}
      <div className="absolute inset-0 [backface-visibility:hidden]">
        <div 
          className="h-full w-full rounded-lg border-2 shadow-lg"
          style={{
            borderColor: color === "AZUL" ? "#1e62ec" : "#e52e2e",
            backgroundImage: `url(${spriteSheet})`,
            backgroundSize: "600% 400%",
            backgroundPosition: `${x}% ${y}%`,
          }}
        />
        {!isSecret && (
          <div className="absolute bottom-0 w-full bg-black/60 py-0.5 text-center text-[10px] font-bold text-white">
            {character.nome}
          </div>
        )}
      </div>

      {/* Back (The "Down" state) */}
      <div className="absolute inset-0 rounded-lg bg-gray-800 [backface-visibility:hidden] [transform:rotateX(180deg)]">
        <div className="flex h-full w-full items-center justify-center opacity-20">
           <div className="h-12 w-12 rounded-full border-4 border-white/30" />
        </div>
      </div>
    </div>
  );
};
