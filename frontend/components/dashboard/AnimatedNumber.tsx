"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useBandSeen } from "./StoryBands";

/**
 * Número que «cuenta» desde el valor anterior hasta el nuevo. Dentro de una
 * banda del relato espera a que la banda se vea (hasta entonces muestra 0). Con
 * `prefers-reduced-motion` se muestra directamente el valor final. Al terminar
 * el conteo añade `is-glowing` 600 ms (pulso cian definido en `aurora.css`).
 */
export default function AnimatedNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const [glowing, setGlowing] = useState(false);
  const from = useRef(0);
  const bandSeen = useBandSeen();

  useEffect(() => {
    if (reduceMotion) {
      from.current = value;
      return;
    }
    if (!bandSeen) {
      return;
    }

    let glowTimer: ReturnType<typeof setTimeout> | undefined;
    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => {
        setDisplay(value);
        setGlowing(true);
        glowTimer = setTimeout(() => setGlowing(false), 600);
      },
    });
    from.current = value;
    return () => {
      controls.stop();
      clearTimeout(glowTimer);
      // Reinicia el brillo para que se repita con el siguiente valor.
      setGlowing(false);
    };
  }, [value, reduceMotion, bandSeen]);

  const shown = reduceMotion ? value : display;

  return <span className={glowing ? "is-glowing" : undefined}>{shown.toLocaleString("es")}</span>;
}
