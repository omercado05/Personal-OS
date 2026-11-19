"use client";

import { usePathname } from "next/navigation";

/** Rutas donde la aurora se muestra con toda su intensidad. */
const VIVID_PREFIXES = ["/dashboard", "/handler"];

/**
 * Capa de fondo «aurora viva»: tres luces difuminadas que derivan despacio.
 * Intensa en el dashboard y el acceso, calmada en el resto. El movimiento y
 * la transición los gobierna `aurora.css` (y se desactivan con
 * `prefers-reduced-motion`).
 */
export default function Aurora() {
  const pathname = usePathname();
  const vivid = VIVID_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="aurora" data-intensity={vivid ? "vivid" : "calm"} aria-hidden="true">
      <span className="aurora__light aurora__light--cyan" />
      <span className="aurora__light aurora__light--green" />
      <span className="aurora__light aurora__light--deep" />
    </div>
  );
}
