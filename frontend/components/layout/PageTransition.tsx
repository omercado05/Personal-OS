"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Transición de entrada al cambiar de ruta: un fundido con un leve
 * desplazamiento vertical. Se apoya en `key={pathname}` para reiniciar la
 * animación en cada navegación.
 *
 * Si el usuario prefiere menos movimiento (`prefers-reduced-motion`), se
 * renderiza el contenido sin animación.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
