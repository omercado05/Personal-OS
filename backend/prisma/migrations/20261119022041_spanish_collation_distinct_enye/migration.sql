-- Intercalación española moderna: ignora mayúsculas y tildes (café = cafe),
-- pero trata la ñ como letra propia (año ≠ ano). Prisma no modela la
-- intercalación de las columnas, por eso esta migración se escribe a mano.
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;

ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;
ALTER TABLE `knowledge_entries` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;
ALTER TABLE `tags` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;
ALTER TABLE `knowledge_entry_tags` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;
ALTER TABLE `projects` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;
ALTER TABLE `project_technologies` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;
ALTER TABLE `tasks` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_es_0900_ai_ci;
