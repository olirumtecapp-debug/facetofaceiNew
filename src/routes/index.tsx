import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "@/assets/logo.png.asset.json";
import playIaAsset from "@/assets/play-ia.png.asset.json";
import playOnlineAsset from "@/assets/play-online.png.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-4 text-white">
      <div className="flex w-full max-w-4xl flex-col items-center gap-12">
        <img src={logoAsset.url} alt="FTF - FACE TO FACE" className="h-32 object-contain" />
        
        <div className="flex w-full flex-col gap-6 md:flex-row">
          <button className="flex-1 rounded-2xl bg-[#1e62ec] p-6 transition-transform hover:scale-105 hover:bg-[#1e62ec]/90">
            <img src={playIaAsset.url} alt="Jogar vs IA" className="mx-auto mb-4 h-24" />
            <h2 className="text-center text-2xl font-bold">JOGAR VS IA</h2>
          </button>
          
          <button className="flex-1 rounded-2xl bg-[#e52e2e] p-6 transition-transform hover:scale-105 hover:bg-[#e52e2e]/90">
            <img src={playOnlineAsset.url} alt="Jogar On-line" className="mx-auto mb-4 h-24" />
            <h2 className="text-center text-2xl font-bold">JOGAR ON-LINE</h2>
          </button>
        </div>
      </div>
    </div>
  );
}
