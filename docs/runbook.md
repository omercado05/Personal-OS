# Runbook de operación — Personal OS

Guía práctica para operar la aplicación: arrancarla, hacer copias de seguridad y
acceder a ella **desde fuera de casa sin coste**.

> Las decisiones y el porqué de cada cosa están en `DEVELOPMENT_PLAN.md`. Este
> documento es el «cómo».

---

## 1. Operación básica

Todos los comandos se ejecutan desde la raíz del repositorio.

```bash
# Levantar todo (construyendo imágenes si hace falta)
docker compose up -d --build

# Ver estado de los 6 servicios
docker compose ps

# Logs de un servicio (backend, frontend, hexclave-server, mysql, postgres, clickhouse)
docker compose logs -f backend

# Parar / arrancar sin borrar datos
docker compose stop
docker compose start

# Actualizar el código de la app tras un `git pull`
docker compose up -d --build backend frontend
```

Tras cualquier cambio en `.env` hay que **recrear** los servicios afectados:

```bash
docker compose up -d --force-recreate backend frontend hexclave-server
```

Si cambias una variable `NEXT_PUBLIC_*` (el host público, ver §2) hay que
**reconstruir el frontend**, porque se incrustan en el bundle en tiempo de build.

### Comprobaciones rápidas

```bash
curl -s http://localhost:4000/api/v1/health          # {"data":{"status":"ok"...}}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/   # 200
```

---

## 2. Configuración del host público (`PUBLIC_HOST`)

Todo lo que ve el navegador se deriva de **dos** variables en `.env`:

```ini
PUBLIC_HOST=localhost   # dónde vive la app de cara al navegador
PUBLIC_SCHEME=http      # http (local y Tailscale) o https (Tailscale Serve/proxy)
```

De ellas se generan automáticamente (ver `docker-compose.yml`): la URL del
frontend, la del backend, las de Hexclave (API y dashboard), el CORS del backend
y el `iss` del JWT. **No hay que tocar nada más.**

El backend acepta como origen **tanto `http://localhost:3000` como
`http://$PUBLIC_HOST:3000`**, así que puedes abrir la app desde el propio equipo
y desde fuera con la misma configuración.

### Cambiar de host (p. ej. al nombre de Tailscale)

```bash
# 1) edita .env
#    PUBLIC_HOST=mi-equipo.tailnet-xxxx.ts.net
# 2) reconstruye el frontend y recrea el resto
docker compose up -d --build frontend --force-recreate backend hexclave-server
```

---

## 3. Copias de seguridad (backups)

Script: [`scripts/backup.sh`](../scripts/backup.sh). Respalda:

- **MySQL** → datos de la aplicación (proyectos, conocimiento, …).
- **Postgres** → datos de Hexclave (proyecto, usuarios, sesiones).

ClickHouse (analytics de Hexclave) **no** se respalda: son métricas regenerables.

```bash
./scripts/backup.sh
# ==> backups/2026-10-14_111315/
#       mysql-personal_os.sql.gz
#       postgres-stackframe.sql.gz
```

- Los backups van a `backups/` (ignorado por Git).
- Se conservan los últimos **14 días** (`BACKUP_RETENTION_DAYS`).
- El script **verifica** que cada volcado contiene tablas: si un dump falla, no
  te quedas con un fichero vacío creyendo que tienes copia.

### Programarlo (cron)

```bash
crontab -e
# copia diaria a las 03:30
30 3 * * * cd /ruta/al/repo && ./scripts/backup.sh >> backups/backup.log 2>&1
```

> Copia también `backups/` fuera de este equipo de vez en cuando (un disco
> externo o la nube): un backup en el mismo disco no protege ante un fallo del
> disco.

---

## 4. Restaurar un backup

> Para y desconecta lo que escribe en la base de datos antes de restaurar.

```bash
docker compose stop backend hexclave-server
```

### MySQL (datos de la app)

El volcado incluye `CREATE DATABASE personal_os` y `USE personal_os`, así que
**sobrescribe** la base actual.

```bash
gunzip -c backups/<fecha>/mysql-personal_os.sql.gz \
  | docker compose exec -T mysql env MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root
```

### Postgres (Hexclave)

El volcado es de la base `stackframe` (sin `CREATE DATABASE`); hay que
recrearla antes.

```bash
docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS stackframe;"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE stackframe;"
gunzip -c backups/<fecha>/postgres-stackframe.sql.gz \
  | docker compose exec -T postgres psql -U postgres -d stackframe
```

### Volver a arrancar

```bash
docker compose start backend hexclave-server
```

> Restaurar Postgres/Create Database requiere que `hexclave-server` esté parado
> (no admite conexiones activas a la base que se va a borrar).

---

## 5. Acceso remoto gratis con Tailscale (R9)

Objetivo: usar la app desde el móvil/portátil **fuera de casa**, sin abrir
puertos en el router y sin dominio propio.

**Tailscale** crea una red privada (VPN mesh) entre tus dispositivos. El tráfico
va cifrado de extremo a extremo por WireGuard, así que **es seguro usar HTTP
dentro de la VPN** (no hace falta certificado ni dominio).

### 5.1. Instalar Tailscale

1. Crea una cuenta gratuita en <https://tailscale.com>.
2. Instala Tailscale en el equipo donde corre la app (el «servidor») y en los
   dispositivos desde los que quieras entrar (móvil, portátil).
3. Autentica ambos con la **misma cuenta**: quedarán en el mismo *tailnet*.

> **Nota WSL2:** si Docker corre en WSL2 y accedes desde Windows, Tailscale
> normalmente se instala en **Windows**. Comprueba que el puerto publicado llega
> por la IP de Tailscale (`http://<ip-o-nombre-tailscale>:3000`). Si no llegara,
> instala Tailscale **dentro de WSL2** y publica los puertos en `0.0.0.0`
> (Docker ya lo hace para 3000/4000/8101/8102).

Averigua el nombre o la IP de Tailscale del equipo:

```bash
tailscale status
tailscale ip -4        # p. ej. 100.101.102.103
```

### 5.2. Apuntar la app a Tailscale

Edita `.env` y reconstruye (ver §2):

```ini
PUBLIC_HOST=100.101.102.103        # o mi-equipo.tailnet-xxxx.ts.net
PUBLIC_SCHEME=http
```

```bash
docker compose up -d --build frontend --force-recreate backend hexclave-server
```

Desde cualquier dispositivo del tailnet:

```text
http://100.101.102.103:3000
```

Inicia sesión con tu usuario habitual.

### 5.3. Estado de la validación

- [x] El flujo completo (login + API del dashboard) **está verificado sobre
  HTTP en un host que no es `localhost`**, que es exactamente el escenario de
  Tailscale. Las cookies de sesión de Hexclave se emiten **sin** `Secure` sobre
  HTTP, así que el login funciona.
- [x] La API de Hexclave responde `Access-Control-Allow-Origin: *`, así que no
  hay problema de CORS entre orígenes.
- [x] **Verificado en el *tailnet* real** (2026-10-14): nodo Tailscale
  **`personal-os`** (`100.114.203.25`, este WSL2). Con `PUBLIC_HOST=100.114.203.25`,
  el flujo completo (login → `GET /api/v1/dashboard` → dashboard) responde `200`
  desde el origen de Tailscale, sin errores. Ver `PROGRESS.md` para el detalle.

> Detalle conocido: en orígenes **no seguros** (`http://` sin `localhost`),
> `crypto.randomUUID` no existe. Es el comportamiento del navegador y hasta ahora
> **no impide** ni el login ni el uso (verificado). Si algún día molesta, la
> solución limpia es servir por **HTTPS** con un certificado de Tailscale
> (`tailscale cert` / `tailscale serve`) y poner `PUBLIC_SCHEME=https`.

---

## 6. Mantenimiento

### Actualizar la imagen de Hexclave (R8)

Está fijada **por digest**, así que no cambia sola. Para subirla a propósito:

```bash
docker pull stackauth/server:latest
docker inspect --format '{{index .RepoDigests 0}}' stackauth/server:latest
# copia el sha256:... en docker-compose.yml (imagen de hexclave-server)
docker compose up -d hexclave-server
./scripts/backup.sh          # copia de seguridad ANTES de actualizar
```

### Rotar secretos

Los secretos viven solo en `.env` (nunca en Git). Si rotas
`STACK_SERVER_SECRET` o las claves internas, recrea `hexclave-server` y vuelve a
iniciar sesión.

### Comprobar que no hay secretos versionados

```bash
git status --short
git ls-files | grep -E '^\.env$' && echo "¡OJO! .env versionado" || echo "OK: .env no está en Git"
```
