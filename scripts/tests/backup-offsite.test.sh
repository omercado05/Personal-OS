#!/usr/bin/env bash
#
# Tests de scripts/backup-offsite.sh (sin Docker ni base de datos).
#   ./scripts/tests/backup-offsite.test.sh
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/scripts/backup-offsite.sh"
failures=0

pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1"; failures=$((failures + 1)); }

# Prepara un backup local falso: backups/<stamp>/ con dos volcados.
setup() {
  WORK="$(mktemp -d)"
  export GNUPGHOME="$WORK/gnupg"
  mkdir -m 700 "$GNUPGHOME"
  STAMP="2026-11-18_033000"
  mkdir -p "$WORK/backups/$STAMP"
  echo "CREATE TABLE a;" | gzip > "$WORK/backups/$STAMP/mysql-personal_os.sql.gz"
  echo "CREATE TABLE b;" | gzip > "$WORK/backups/$STAMP/postgres-stackframe.sql.gz"
  printf 'contraseña de prueba' > "$WORK/passphrase"
  chmod 600 "$WORK/passphrase"
  mkdir -p "$WORK/offsite"
}

run() {
  BACKUP_OFFSITE_DIR="$WORK/offsite" BACKUP_PASSPHRASE_FILE="$WORK/passphrase" \
    "$SCRIPT" "$WORK/backups/$STAMP" > "$WORK/out" 2>&1
}

echo "backup-offsite.sh"

# 1. Cifra el backup y lo deja en la carpeta externa.
setup
run; code=$?
file="$WORK/offsite/personal-os-$STAMP.tar.gpg"
if [[ $code -eq 0 && -s "$file" ]]; then pass "crea el archivo cifrado"; else fail "crea el archivo cifrado (exit $code)"; cat "$WORK/out"; fi

# 2. Con la contraseña correcta se recuperan los dos volcados.
listing="$(gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$WORK/passphrase" \
  --decrypt "$file" 2>/dev/null | tar -tf - 2>/dev/null)"
if grep -q "$STAMP/mysql-personal_os.sql.gz" <<<"$listing" && grep -q "$STAMP/postgres-stackframe.sql.gz" <<<"$listing"; then
  pass "se descifra con la contraseña y contiene ambos volcados"
else fail "se descifra con la contraseña y contiene ambos volcados"; fi

# 3. Con otra contraseña no se puede abrir; y el archivo no está en claro.
printf 'otra' > "$WORK/wrong"
if gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$WORK/wrong" --decrypt "$file" >/dev/null 2>&1; then
  fail "una contraseña incorrecta no lo abre"
else pass "una contraseña incorrecta no lo abre"; fi
if tar -tf "$file" >/dev/null 2>&1; then fail "no es un tar legible sin descifrar"; else pass "no es un tar legible sin descifrar"; fi

# 4. No deja archivos temporales en la carpeta externa.
if [[ "$(find "$WORK/offsite" -type f | wc -l)" -eq 1 ]]; then pass "solo deja el archivo final"; else fail "solo deja el archivo final"; ls -la "$WORK/offsite"; fi
rm -rf "$WORK"

# 5. Sin archivo de contraseña: avisa y no falla (el backup local ya existe).
setup
rm "$WORK/passphrase"
run; code=$?
if [[ $code -eq 0 ]] && grep -q "AVISO" "$WORK/out" && [[ -z "$(ls -A "$WORK/offsite")" ]]; then
  pass "sin contraseña avisa, no sube nada y no falla"
else fail "sin contraseña avisa, no sube nada y no falla (exit $code)"; cat "$WORK/out"; fi
rm -rf "$WORK"

# 6. Sin BACKUP_OFFSITE_DIR no hace nada.
setup
BACKUP_PASSPHRASE_FILE="$WORK/passphrase" BACKUP_OFFSITE_DIR="" "$SCRIPT" "$WORK/backups/$STAMP" > "$WORK/out" 2>&1; code=$?
if [[ $code -eq 0 && -z "$(ls -A "$WORK/offsite")" ]]; then pass "sin carpeta externa configurada no hace nada"; else fail "sin carpeta externa configurada no hace nada"; fi
rm -rf "$WORK"

# 7. Carpeta externa inaccesible: falla con error.
setup
BACKUP_OFFSITE_DIR="/no/existe/onedrive" BACKUP_PASSPHRASE_FILE="$WORK/passphrase" "$SCRIPT" "$WORK/backups/$STAMP" > "$WORK/out" 2>&1; code=$?
if [[ $code -ne 0 ]] && grep -q "ERROR" "$WORK/out"; then pass "carpeta externa inaccesible da error"; else fail "carpeta externa inaccesible da error (exit $code)"; fi
rm -rf "$WORK"

# 8. Retención: borra copias externas de más de BACKUP_OFFSITE_RETENTION_DAYS (30).
setup
touch -d "40 days ago" "$WORK/offsite/personal-os-2026-10-01_033000.tar.gpg"
touch -d "10 days ago" "$WORK/offsite/personal-os-2026-11-08_033000.tar.gpg"
touch -d "40 days ago" "$WORK/offsite/otro-archivo.txt"
run
if [[ ! -e "$WORK/offsite/personal-os-2026-10-01_033000.tar.gpg" && -e "$WORK/offsite/personal-os-2026-11-08_033000.tar.gpg" && -e "$WORK/offsite/otro-archivo.txt" ]]; then
  pass "borra solo copias propias de más de 30 días"
else fail "borra solo copias propias de más de 30 días"; ls -la "$WORK/offsite"; fi
rm -rf "$WORK"

# 9. Un backup grande también se verifica (la lectura del tar no puede cortarse a medias).
setup
# Volcados de ~10 MB: tras el primero que aparezca en el tar aún queda mucho por leer.
for f in mysql-personal_os postgres-stackframe; do
  head -c 10000000 /dev/urandom > "$WORK/backups/$STAMP/$f.sql.gz"
done
run; code=$?
if [[ $code -eq 0 && -s "$WORK/offsite/personal-os-$STAMP.tar.gpg" ]]; then pass "verifica también un backup grande"; else fail "verifica también un backup grande (exit $code)"; cat "$WORK/out"; fi
rm -rf "$WORK"

echo
if [[ $failures -eq 0 ]]; then echo "Todos los tests pasan."; else echo "$failures test(s) fallan."; exit 1; fi
