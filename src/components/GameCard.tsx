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
      className={`relative aspect-[3/4] cursor-pointer transition-all duration-300 ${isDown ? "opacity-30 grayscale contrast-75" : "opacity-100"}`}
      onClick={onClick}
    >
      <div 
        className="h-full w-full rounded-md border-[3px] shadow-lg flex flex-col overflow-hidden bg-[#0d1117]"
        style={{
          borderColor: color === "AZUL" ? "#1e62ec" : "#e52e2e",
        }}
      >
        <div 
          className="flex-1 w-full relative overflow-hidden"
        >
          <div 
            className="absolute inset-[-10%] w-[120%] h-[120%]"
            style={{
              backgroundImage: `url(${spriteSheet})`,
              backgroundSize: "600% 400%",
              backgroundPosition: `${x}% ${y}%`,
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
        {!isSecret && (
          <div className="bg-black/80 py-0.5 text-center text-[9px] font-black text-white uppercase tracking-tighter leading-none">
            {character.nome}
          </div>
        )}
      </div>
      
      {/* Visual indicator for eliminated cards */}
      {isDown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-10 h-10 border-4 border-red-500/50 rounded-full flex items-center justify-center">
             <div className="w-6 h-1 bg-red-500/50 rotate-45 absolute" />
             <div className="w-6 h-1 bg-red-500/50 -rotate-45 absolute" />
           </div>
        </div>
      )}
    </div>
  );
};
