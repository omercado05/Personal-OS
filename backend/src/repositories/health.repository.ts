import { prisma } from "../lib/prisma.js";

/** Firma de una función que comprueba la disponibilidad de la base de datos. */
export type DatabasePinger = () => Promise<boolean>;

/**
 * Comprueba que la base de datos responde ejecutando `SELECT 1`.
 *
 * Devuelve `false` en lugar de lanzar: para una comprobación de readiness, que
 * la base de datos esté caída es un dato esperado, no una excepción.
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
