import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * Tipografías del sistema de diseño «Bento Neon» (ver
 * `docs/design-system/personal-os/MASTER.md`).
 *
 * `next/font` las descarga y las sirve en tiempo de build (self-hosted), lo que
 * evita peticiones a Google en el navegador y el *layout shift* (asigna
 * `font-display: swap` y métricas de respaldo). Cada una expone una variable
 * CSS que `app/globals.css` consume.
 *
 * - `--font-display` → Space Grotesk (títulos y cifras destacadas).
 * - `--font-sans`    → Inter (texto de interfaz).
 * - `--font-mono`    → JetBrains Mono (datos, código y cifras tabulares).
 */
export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

/** Cadena de clases que activa las tres variables tipográficas en `<html>`. */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`;
