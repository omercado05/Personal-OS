#!/usr/bin/env bash
#
# Backups locales de los datos de Personal OS (R10 del plan).
#
#   ./scripts/backup.sh
#
# Hace un volcado comprimido de:
#   - MySQL   → datos de la aplicación (proyectos, conocimiento, ...)
#   - Postgres → datos de Hexclave (proyecto, usuarios, sesiones)
#
# ClickHouse (analytics de Hexclave) NO se respalda: son métricas regenerables.
#
# Cada ejecución crea `backups/<fecha>/` con los dos ficheros. Los backups más
# antiguos que BACKUP_RETENTION_DAYS (14 por defecto) se eliminan.
#
# Variables de entorno opcionales:
#   BACKUP_DIR             (por defecto ./backups)
#   BACKUP_RETENTION_DAYS  (por defecto 14)
#
# Pensado para lanzarse desde el repositorio y para programarse con cron, p. ej.
# para una copia diaria a las 03:30:
#   30 3 * * * cd /ruta/al/repo && ./scripts/backup.sh >> backups/backup.log 2>&1

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Lee una variable: primero del entorno, si no del fichero .env.
read_env() {
  local name="$1"
  if [[ -n "${!name:-}" ]]; then
    printf '%s' "${!name}"
    return
  fi
  [[ -f .env ]] || return 0
  grep -E "^${name}=" .env | head -1 | cut -d= -f2-
}

MYSQL_USER="$(read_env MYSQL_USER)"
MYSQL_PASSWORD="$(read_env MYSQL_PASSWORD)"
MYSQL_DATABASE="$(read_env MYSQL_DATABASE)"
POSTGRES_USER="$(read_env POSTGRES_USER)"
POSTGRES_DB="$(read_env POSTGRES_DB)"

for var in MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE POSTGRES_USER POSTGRES_DB; do
  if [[ -z "${!var}" ]]; then
    echo "ERROR: falta ${var} (defínela en el entorno o en .env)." >&2
    exit 1
  fi
done

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
DEST="$BACKUP_DIR/$STAMP"

mkdir -p "$DEST"
echo "==> Backup en $DEST"

# --- MySQL: datos de la aplicación -----------------------------------------
# MYSQL_PWD evita pasar la contraseña por la línea de comandos.
# --no-tablespaces: el usuario de la app no tiene el privilegio PROCESS, que
# mysqldump necesita para volcar tablespaces (no los necesitamos).
docker compose exec -T mysql \
  env MYSQL_PWD="$MYSQL_PASSWORD" \
  mysqldump --user="$MYSQL_USER" --single-transaction --routines --triggers \
  --no-tablespaces --databases "$MYSQL_DATABASE" \
  | gzip > "$DEST/mysql-$MYSQL_DATABASE.sql.gz"

# --- Postgres: datos de Hexclave -------------------------------------------
docker compose exec -T postgres \
  pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip > "$DEST/postgres-$POSTGRES_DB.sql.gz"

# --- Comprobación mínima: los volcados no pueden quedar vacíos --------------
for file in "$DEST"/*.sql.gz; do
  if [[ ! -s "$file" ]]; then
    echo "ERROR: el volcado $file está vacío." >&2
    exit 1
  fi
  if [[ "$(gzip -cd "$file" | grep -c "CREATE TABLE")" -eq 0 ]]; then
    echo "ERROR: el volcado $file no contiene tablas (¿falló el dump?)." >&2
    exit 1
  fi
  echo "    $(basename "$file") — $(du -h "$file" | cut -f1)"
done

# --- Rotación: elimina backups más antiguos que la retención ----------------
deleted=0
while IFS= read -r old; do
  rm -rf "$old"
  deleted=$((deleted + 1))
done < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*-*-*_*' -mtime "+$RETENTION_DAYS")
[[ $deleted -gt 0 ]] && echo "    ($deleted backup(s) antiguo(s) eliminado(s))"

echo "==> Backup completado."
