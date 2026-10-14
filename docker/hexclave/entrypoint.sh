#!/bin/sh
# Personal OS — wrapper de arranque del contenedor de Hexclave (Stack Auth).
#
# El entrypoint oficial de `stackauth/server` ejecuta SIEMPRE el seed
# (`node dist/db-migrations.mjs seed`) y, con `set -e`, si el seed falla el
# contenedor muere -> `restart: unless-stopped` -> crash-loop.
#
# Ese seed NO es idempotente: la primera vez crea el proyecto
# "Development Environment Project" (id = HEXCLAVE_PROJECT_ID) con
# is_development_environment = true; en arranques posteriores intenta
# reescribir sus config overrides. Stack Auth bloquea escrituras sobre
# proyectos de development environment (setEnvironmentConfigOverride lanza
# "Environment configuration overrides cannot be changed in a development
# environment"), lo que tumba el contenedor en cada reinicio.
#
# Solución: omitir el seed cuando el proyecto ya existe en Postgres (es decir,
# en cualquier reinicio). En un volumen limpio el proyecto NO existe y el seed
# sí corre, para sembrar los proyectos, el admin y los API keys.
#
# La configuración explícita manda: si definís STACK_SKIP_SEED_SCRIPT o
# STACK_RUN_SEED_SCRIPT, no se auto-detecta nada.
set -e

db_url="${STACK_DATABASE_CONNECTION_STRING:-${HEXCLAVE_DATABASE_CONNECTION_STRING:-}}"

if [ -z "${STACK_SKIP_SEED_SCRIPT:-}" ] && [ -z "${STACK_RUN_SEED_SCRIPT:-}" ] && [ -n "$db_url" ]; then
  # La tabla "Project" existe solo después de las migraciones. En un volumen
  # limpio esta consulta falla (relación inexistente) -> no se omite el seed.
  already_seeded="$(psql "$db_url" -tAc 'SELECT 1 FROM "Project" LIMIT 1' 2>/dev/null || true)"
  if [ "$already_seeded" = "1" ]; then
    echo "[hexclave-entrypoint] Proyecto ya sembrado: se omite el seed (no idempotente)."
    export STACK_SKIP_SEED_SCRIPT=true
  fi
fi

cd /app
exec ./entrypoint.sh "$@"
