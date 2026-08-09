import React, { ReactNode } from "react";

export const Shell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#0b0e14]">
      {children}
    </div>
  );
};
