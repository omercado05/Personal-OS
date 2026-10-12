-- Base de datos "shadow" para `prisma migrate dev`.
--
-- En MySQL, Prisma NO crea automáticamente la base de datos shadow: debe existir
-- y estar vacía. Este script solo se ejecuta la primera vez que se inicializa el
-- volumen de MySQL (`docker compose down -v` && `up`). Si el volumen ya existía,
-- créala a mano una vez:
--
--   docker compose exec mysql sh -c \
--     'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS personal_os_shadow"'
--
CREATE DATABASE IF NOT EXISTS personal_os_shadow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
