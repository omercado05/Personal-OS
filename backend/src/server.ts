import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = buildApp();

async function start(): Promise<void> {
  try {
    await app.listen({ host: env.host, port: env.port });
  } catch (error) {
    app.log.error(error, "No se pudo iniciar el servidor");
    process.exit(1);
  }
}

function registerShutdownHandlers(): void {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, "Cerrando el servidor");
      app
        .close()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          app.log.error(error, "Error al cerrar el servidor");
          process.exit(1);
        });
    });
  }
}

registerShutdownHandlers();
await start();
