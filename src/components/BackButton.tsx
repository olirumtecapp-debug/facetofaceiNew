import React from "react";

export const BackButton = ({ onClick, className = "" }: { onClick: () => void, className?: string }) => {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-1.5 rounded-lg border-2 border-gray-400/30 bg-gray-800/50 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400 transition-all hover:border-yellow-400/50 hover:text-yellow-400 hover:scale-105 active:scale-95 ${className}`}
    >
      <span className="text-sm">{"<"}</span> Voltar
    </button>
  );
};
