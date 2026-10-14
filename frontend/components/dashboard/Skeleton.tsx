/** Bloque *skeleton* para estados de carga (con brillo animado en CSS). */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}
