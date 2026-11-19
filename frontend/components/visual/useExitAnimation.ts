"use client";

import { useReducedMotion } from "motion/react";
import { useState } from "react";

const EXIT_MS = 250;

/**
 * Animación de salida al borrar: el contenedor se encoge (scale .96) y se
 * desvanece durante 250 ms. `play()` resuelve al terminar; con movimiento
 * reducido resuelve al instante y sin animar. `reset()` revierte si falla.
 */
export function useExitAnimation() {
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  return {
    motionProps: {
      initial: false,
      animate: leaving ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 },
      transition: { duration: EXIT_MS / 1000, ease: "easeOut" },
    } as const,
    play: async () => {
      if (reduceMotion) return;
      setLeaving(true);
      await new Promise((resolve) => setTimeout(resolve, EXIT_MS));
    },
    reset: () => setLeaving(false),
  };
}
