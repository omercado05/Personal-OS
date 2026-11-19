"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const PARTICLES = 12;
const DISTANCE = 34;

/** Direcciones fijas repartidas en círculo, con radio alterno para dar relieve. */
const VECTORS = Array.from({ length: PARTICLES }, (_, index) => {
  const angle = (index / PARTICLES) * Math.PI * 2;
  const radius = index % 2 === 0 ? DISTANCE : DISTANCE * 0.65;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
});

type BurstProps = {
  /** Cada cambio posterior al montaje (a un valor distinto de 0) lanza una nueva ráfaga. */
  trigger: number;
};

/**
 * Ráfaga decorativa de partículas verdes que sale del centro del contenedor
 * padre (debe ser `position: relative`). Solo anima transform/opacity y no
 * pinta nada con movimiento reducido.
 */
export function Burst({ trigger }: BurstProps) {
  const reduceMotion = useReducedMotion();
  // El valor con el que se monta no dispara: solo los cambios posteriores.
  const [mounted] = useState(trigger);
  if (trigger === 0 || trigger === mounted || reduceMotion) return null;

  return (
    <span className="burst" aria-hidden="true" key={trigger}>
      {VECTORS.map((vector, index) => (
        <motion.span
          key={index}
          className="burst__dot"
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: vector.x, y: vector.y, scale: 0.2, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </span>
  );
}
