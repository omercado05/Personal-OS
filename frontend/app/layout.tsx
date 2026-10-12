import { HexclaveProvider, HexclaveTheme } from "@hexclave/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { hexclaveClientApp } from "@/hexclave/client";

import "./globals.css";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Sistema personal para proyectos, conocimiento e ideas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <HexclaveProvider app={hexclaveClientApp}>
          <HexclaveTheme>{children}</HexclaveTheme>
        </HexclaveProvider>
      </body>
    </html>
  );
}
