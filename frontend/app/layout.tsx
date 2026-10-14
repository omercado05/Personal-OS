import { HexclaveProvider, HexclaveTheme } from "@hexclave/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { hexclaveClientApp } from "@/hexclave/client";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Sistema personal para proyectos, conocimiento e ideas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={fontVariables} suppressHydrationWarning>
      <body>
        <HexclaveProvider app={hexclaveClientApp}>
          <HexclaveTheme>{children}</HexclaveTheme>
        </HexclaveProvider>
      </body>
    </html>
  );
}
