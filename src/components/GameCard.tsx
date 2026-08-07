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
  const cols = 6;
  const rows = 4;
  const index = character.id - 1;
  
  // Adjusted percentages for precise 6x4 sprite sheet centering
  const x = (index % cols) * (100 / (cols - 1));
  const y = Math.floor(index / cols) * (100 / (rows - 1));

  const spriteSheet = color === "AZUL" ? cardsAzulAsset.url : cardsVermelhoAsset.url;

  return (
    <div 
      className={`relative aspect-[3/4] cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-0.5 ${isDown ? "opacity-30 grayscale contrast-75" : "opacity-100"}`}
      onClick={onClick}
    >
      <div 
        className="h-full w-full rounded-md border-[2px] sm:border-[3px] shadow-lg flex flex-col overflow-hidden bg-[#0d1117] relative"
        style={{
          borderColor: color === "AZUL" ? "#1e62ec" : "#e52e2e",
        }}
      >
        <div 
          className="flex-1 w-full relative overflow-hidden bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${spriteSheet})`,
            backgroundSize: "600% 400%",
            backgroundPosition: `${x}% ${y}%`,
          }}
        />
        
        {/* We removed the character name text to prevent duplication and respect the original plaque in the image */}
      </div>
      
      {/* Visual indicator for eliminated cards */}
      {isDown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
           <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-red-500/50 rounded-full flex items-center justify-center bg-black/20">
             <div className="w-5 sm:w-6 h-1 bg-red-500/50 rotate-45 absolute" />
             <div className="w-5 sm:w-6 h-1 bg-red-500/50 -rotate-45 absolute" />
           </div>
        </div>
      )}
    </div>
  );
};
