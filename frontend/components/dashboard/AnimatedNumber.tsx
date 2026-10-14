"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Número que «cuenta» desde el valor anterior hasta el nuevo. Con
 * `prefers-reduced-motion` se muestra directamente el valor final.
 */
export default function AnimatedNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      from.current = value;
      return;
    }

    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => setDisplay(value),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduceMotion]);

  const shown = reduceMotion ? value : display;

  return <>{shown.toLocaleString("es")}</>;
}
