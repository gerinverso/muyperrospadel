-- Jugadores globales del club.
--
-- Hasta ahora cada jugador pertenecia a un unico torneo (Player.tournamentId).
-- A partir de esta migracion el jugador vive por fuera de los torneos y se
-- anota a cada uno mediante la tabla de relacion "_TournamentPlayers".
--
-- La migracion conserva TODOS los datos existentes:
--   * cada Player actual se convierte en jugador global,
--   * su tournamentId se transforma en una inscripcion al torneo,
--   * las personas cargadas mas de una vez (mismo nombre en torneos distintos)
--     se unifican en un solo jugador y se reapuntan sus parejas.

-- 1. Columnas nuevas de Player. Se crean nullable para poder completarlas
--    con los datos actuales antes de exigirlas.
ALTER TABLE "Player" ADD COLUMN "dni" TEXT;
ALTER TABLE "Player" ADD COLUMN "nameKey" TEXT;
ALTER TABLE "Player" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- 2. Nombre normalizado (minusculas, sin espacios de mas) para detectar a la
--    misma persona cargada con distinta tipografia.
UPDATE "Player"
SET "nameKey" = lower(regexp_replace(btrim("name"), '\s+', ' ', 'g')),
    "updatedAt" = "createdAt";

-- 3. Tabla de inscripciones (relacion muchos-a-muchos Player <-> Tournament).
--    Prisma ordena los lados alfabeticamente: A = Player, B = Tournament.
CREATE TABLE "_TournamentPlayers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TournamentPlayers_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_TournamentPlayers_B_index" ON "_TournamentPlayers"("B");

-- 4. Cada jugador actual queda inscripto al torneo al que pertenecia.
INSERT INTO "_TournamentPlayers" ("A", "B")
SELECT "id", "tournamentId" FROM "Player"
ON CONFLICT DO NOTHING;

-- 5. El indice viejo obligaba a que un jugador estuviera en una unica pareja
--    en toda la historia. Se elimina antes de unificar duplicados, porque la
--    unificacion reasigna parejas de distintos torneos al mismo jugador.
DROP INDEX "Pair_player1Id_key";
DROP INDEX "Pair_player2Id_key";

-- 6. Unificacion de personas duplicadas.
--    Sólo se pueden unificar filas del mismo nombre que estén en torneos
--    DISTINTOS. Si un mismo nombre aparece dos veces dentro del mismo torneo
--    se trata de dos anotaciones separadas: no se unifican y se les da un
--    nameKey distinto para que el indice unico no falle.
CREATE TEMP TABLE "_player_unsafe_names" AS
SELECT "nameKey"
FROM "Player"
GROUP BY "nameKey", "tournamentId"
HAVING count(*) > 1;

-- 6a. Nombres conflictivos dentro de un mismo torneo: se desambiguan.
UPDATE "Player" p
SET "nameKey" = p."nameKey" || ' #' || p."id"
WHERE p."nameKey" IN (SELECT "nameKey" FROM "_player_unsafe_names");

-- 6b. Para el resto, se conserva el jugador mas antiguo de cada nombre.
CREATE TEMP TABLE "_player_dedupe" AS
SELECT p."id" AS dup_id, c."id" AS keep_id
FROM "Player" p
JOIN (
    SELECT DISTINCT ON ("nameKey") "nameKey", "id"
    FROM "Player"
    ORDER BY "nameKey", "createdAt" ASC, "id" ASC
) c ON c."nameKey" = p."nameKey"
WHERE p."id" <> c."id";

-- Las inscripciones de los duplicados pasan al jugador que se conserva.
INSERT INTO "_TournamentPlayers" ("A", "B")
SELECT d.keep_id, tp."B"
FROM "_TournamentPlayers" tp
JOIN "_player_dedupe" d ON d.dup_id = tp."A"
ON CONFLICT DO NOTHING;

DELETE FROM "_TournamentPlayers" tp
USING "_player_dedupe" d
WHERE tp."A" = d.dup_id;

-- Las parejas historicas apuntan al jugador que se conserva.
UPDATE "Pair" p SET "player1Id" = d.keep_id
FROM "_player_dedupe" d WHERE p."player1Id" = d.dup_id;

UPDATE "Pair" p SET "player2Id" = d.keep_id
FROM "_player_dedupe" d WHERE p."player2Id" = d.dup_id;

DELETE FROM "Player" p USING "_player_dedupe" d WHERE p."id" = d.dup_id;

DROP TABLE "_player_dedupe";
DROP TABLE "_player_unsafe_names";

-- 7. Ya con los datos completos, las columnas nuevas pasan a ser obligatorias.
ALTER TABLE "Player" ALTER COLUMN "nameKey" SET NOT NULL;
ALTER TABLE "Player" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 8. El jugador deja de pertenecer a un torneo.
ALTER TABLE "Player" DROP CONSTRAINT "Player_tournamentId_fkey";
ALTER TABLE "Player" DROP COLUMN "tournamentId";

-- 9. Ahora la restriccion es una pareja por jugador POR TORNEO.
CREATE UNIQUE INDEX "Pair_tournamentId_player1Id_key" ON "Pair"("tournamentId", "player1Id");
CREATE UNIQUE INDEX "Pair_tournamentId_player2Id_key" ON "Pair"("tournamentId", "player2Id");

-- 10. Identidad del jugador global.
CREATE UNIQUE INDEX "Player_nameKey_key" ON "Player"("nameKey");
CREATE UNIQUE INDEX "Player_dni_key" ON "Player"("dni");

-- 11. Claves foraneas de la tabla de inscripciones.
ALTER TABLE "_TournamentPlayers" ADD CONSTRAINT "_TournamentPlayers_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_TournamentPlayers" ADD CONSTRAINT "_TournamentPlayers_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
