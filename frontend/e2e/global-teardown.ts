import { execFileSync } from "node:child_process";
import path from "node:path";

import { credentials } from "./helpers";

/**
 * Limpieza final, aunque algún test haya fallado a medias: borra de MySQL los
 * datos del usuario de prueba creados por los tests (prefijo `e2e-`). Solo toca
 * filas de ese usuario; los tests se ejecutan contra el stack local de Docker.
 */
export default function globalTeardown(): void {
  const { email } = credentials();
  const quoted = `'${email.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
  const sql = `
    SET @u := (SELECT id FROM users WHERE email = ${quoted});
    DELETE FROM tasks WHERE user_id = @u AND title LIKE 'e2e-%';
    DELETE FROM projects WHERE user_id = @u AND name LIKE 'e2e-%';
    DELETE FROM knowledge_entries WHERE user_id = @u AND title LIKE 'e2e-%';
  `;
  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "mysql",
      "sh",
      "-c",
      'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" personal_os 2>/dev/null',
    ],
    { cwd: path.resolve(__dirname, "../.."), input: sql, stdio: ["pipe", "ignore", "inherit"] },
  );
}
