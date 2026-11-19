#!/usr/bin/env bash
#
# Copia cifrada de un backup local fuera del equipo (p. ej. a OneDrive).
#
#   ./scripts/backup-offsite.sh backups/<fecha>
#
# Empaqueta la carpeta del backup, la cifra con gpg (AES-256, contraseña
# simétrica leída de un archivo) y la deja en BACKUP_OFFSITE_DIR como
# `personal-os-<fecha>.tar.gpg`. Antes de darla por buena comprueba que se
# descifra y contiene los volcados. Lo llama scripts/backup.sh al terminar.
#
# Variables de entorno (o .env):
#   BACKUP_OFFSITE_DIR              carpeta de destino; vacía = no hace nada
#   BACKUP_PASSPHRASE_FILE          por defecto ~/.config/personal-os/backup-passphrase
#   BACKUP_OFFSITE_RETENTION_DAYS   por defecto 30
#
# Sin archivo de contraseña solo avisa: el backup local ya está hecho.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Lee una variable: primero del entorno (aunque esté vacía), si no del .env.
read_env() {
  local name="$1"
  if [[ -n "${!name+x}" ]]; then
    printf '%s' "${!name}"
    return
  fi
  [[ -f "$ROOT/.env" ]] || return 0
  # `|| true`: que la variable no esté en .env no es un error.
  { grep -E "^${name}=" "$ROOT/.env" || true; } | head -1 | cut -d= -f2-
}

SOURCE="${1:?Uso: backup-offsite.sh <carpeta del backup>}"
SOURCE="$(cd "$SOURCE" && pwd)"
STAMP="$(basename "$SOURCE")"

OFFSITE_DIR="$(read_env BACKUP_OFFSITE_DIR)"
PASSPHRASE_FILE="$(read_env BACKUP_PASSPHRASE_FILE)"
PASSPHRASE_FILE="${PASSPHRASE_FILE:-$HOME/.config/personal-os/backup-passphrase}"
RETENTION_DAYS="$(read_env BACKUP_OFFSITE_RETENTION_DAYS)"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Sin carpeta externa configurada, la copia externa está desactivada.
[[ -n "$OFFSITE_DIR" ]] || exit 0

if [[ ! -s "$PASSPHRASE_FILE" ]]; then
  echo "AVISO: no hay contraseña en $PASSPHRASE_FILE; la copia externa no se ha hecho." >&2
  exit 0
fi

if [[ ! -d "$OFFSITE_DIR" ]] && ! mkdir -p "$OFFSITE_DIR" 2>/dev/null; then
  echo "ERROR: no se puede usar la carpeta externa $OFFSITE_DIR." >&2
  exit 1
fi

TARGET="$OFFSITE_DIR/personal-os-$STAMP.tar.gpg"
# Se escribe primero en local y se mueve al final: el sincronizador (OneDrive)
# nunca ve un archivo a medias.
TMP="$(mktemp "${TMPDIR:-/tmp}/personal-os-offsite.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

gpg_opts=(--batch --yes --quiet --pinentry-mode loopback --passphrase-file "$PASSPHRASE_FILE")

tar -C "$(dirname "$SOURCE")" -cf - "$STAMP" \
  | gpg "${gpg_opts[@]}" --symmetric --cipher-algo AES256 --output "$TMP"

# Verificación: debe descifrarse y contener al menos un volcado. El listado se
# lee entero antes de buscar: `grep -q` cortaría la tubería a medias y, con
# pipefail, una copia correcta parecería fallida.
if ! listing="$(gpg "${gpg_opts[@]}" --decrypt "$TMP" | tar -tf -)" \
  || ! grep -q '\.sql\.gz$' <<<"$listing"; then
  echo "ERROR: la copia cifrada no se puede verificar." >&2
  exit 1
fi

mv "$TMP" "$TARGET"
trap - EXIT
echo "    copia cifrada → $TARGET — $(du -h "$TARGET" | cut -f1)"

# Rotación: solo las copias propias más antiguas que la retención.
find "$OFFSITE_DIR" -maxdepth 1 -type f -name 'personal-os-*.tar.gpg' -mtime "+$RETENTION_DAYS" -delete
