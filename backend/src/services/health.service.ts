import { env } from "../config/env.js";
import { pingDatabase, type DatabasePinger } from "../repositories/health.repository.js";

const SERVICE_NAME = "personal-os-api";

/** Información de liveness: el proceso está vivo. */
export interface LivenessInfo {
  status: "ok";
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

/** Información de readiness: las dependencias (base de datos) responden. */
export interface ReadinessInfo {
  status: "ok" | "degraded";
  database: "up" | "down";
  latencyMs: number;
}

export interface HealthService {
  liveness(): LivenessInfo;
  readiness(timeoutMs: number): Promise<ReadinessInfo>;
}

/** Resuelve con `fallback` si la promesa no se resuelve dentro de `timeoutMs`. */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), timeoutMs);
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Servicio de salud. Recibe la función de "ping" por inyección para poder
 * testear sin base de datos real.
 */
export function createHealthService(ping: DatabasePinger = pingDatabase): HealthService {
  return {
    liveness(): LivenessInfo {
      return {
        status: "ok",
        service: SERVICE_NAME,
        version: env.appVersion,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    },

    async readiness(timeoutMs: number): Promise<ReadinessInfo> {
      const startedAt = performance.now();
      const databaseUp = await withTimeout(ping(), timeoutMs, false);
      return {
        status: databaseUp ? "ok" : "degraded",
        database: databaseUp ? "up" : "down",
        latencyMs: Math.round(performance.now() - startedAt),
      };
    },
  };
}
