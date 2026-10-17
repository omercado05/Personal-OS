import { HexclaveProvider, HexclaveTheme } from "@hexclave/next";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { createHexclaveClientApp } from "@/hexclave/client";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Sistema personal para proyectos, conocimiento e ideas.",
};

const AUTH_COLORS = {
  background: "#07080c",
  foreground: "#e8edf7",
  card: "#10131c",
  cardForeground: "#e8edf7",
  popover: "#161a26",
  popoverForeground: "#e8edf7",
  primary: "#22d3ee",
  primaryForeground: "#04141a",
  secondary: "#161a26",
  secondaryForeground: "#e8edf7",
  muted: "#161a26",
  mutedForeground: "#8b95a9",
  accent: "#22d3ee",
  accentForeground: "#04141a",
  destructive: "#f87171",
  destructiveForeground: "#04141a",
  border: "rgba(255, 255, 255, 0.08)",
  input: "rgba(255, 255, 255, 0.12)",
  ring: "#22d3ee",
} as const;

const HEXCLAVE_THEME = {
  radius: "14px",
  light: AUTH_COLORS,
  dark: AUTH_COLORS,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // La URL de la API de Hexclave que usa el navegador se decide aquí: usamos el
  // `host` de la petición para que el navegador llame a Hexclave en su mismo
  // host (solo cambia el puerto) y no como recurso de terceros. Ver
  // `hexclave/client.ts`.
  const host = (await headers()).get("host");
  const hexclaveClientApp = createHexclaveClientApp(host);

  return (
    <html lang="es" className={fontVariables} suppressHydrationWarning>
      <body>
        <HexclaveProvider app={hexclaveClientApp} lang="es-ES">
          <HexclaveTheme theme={HEXCLAVE_THEME}>{children}</HexclaveTheme>
        </HexclaveProvider>
      </body>
    </html>
  );
}
