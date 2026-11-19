"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Tarjeta de acceso: cristal con haz de luz, entrada con motion y flotación
 * suave en bucle (CSS en `.auth-float`, anulada con reducción de movimiento).
 * La flotación vive en el contenedor y la entrada en la tarjeta para que sus
 * `transform` no compitan.
 */
export default function AuthCard({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="auth-float">
      <motion.div
        className="auth-card glass beam"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
