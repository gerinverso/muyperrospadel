-- Anuncio de torneo e identidad del jugador por DNI.
--
-- Dos cambios que van juntos:
--
--   1. El torneo pasa a tener fecha de inicio y un interruptor de
--      inscripciones, para poder anunciarlo en la web y dejar que cada jugador
--      se anote solo.
--   2. El nombre deja de ser la identidad de una persona. Hasta ahora
--      "Player.nameKey" era unico, asi que el sistema no podia representar dos
--      homonimos. A partir de aca la identidad real es el DNI y el nombre
--      normalizado queda solo como pista para detectar duplicados.
--
-- No se pierde ningun dato: las columnas nuevas tienen default y el backfill
-- solo recalcula "nameKey", que es un valor derivado de "name".

-- 1. Anuncio e inscripciones del torneo.
ALTER TABLE "Tournament" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "Tournament" ADD COLUMN "registrationOpen" BOOLEAN NOT NULL DEFAULT false;

-- 2. El nombre deja de identificar a la persona.
--    Tiene que caer ANTES del backfill: recalcular los "nameKey" puede generar
--    repetidos y el indice unico lo rechazaria.
DROP INDEX "Player_nameKey_key";

-- 3. Backfill de "nameKey" con la normalizacion nueva: minusculas, espacios de
--    mas colapsados y SIN ACENTOS. Se usa translate() y no la extension
--    unaccent, que puede no estar instalada en el Postgres hosteado.
--
--    Efecto buscado: la migracion 20260819120000 desambiguo a la fuerza los
--    homonimos que caian dentro de un mismo torneo, dejandoles
--    'juan perez #<id>'. Al recalcular desde "name" esos sufijos desaparecen y
--    esos jugadores vuelven a agruparse como posibles duplicados, que es donde
--    el administrador tiene que verlos.
UPDATE "Player"
SET "nameKey" = lower(
  translate(
    regexp_replace(btrim("name"), '\s+', ' ', 'g'),
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
  )
);

-- 4. El nombre normalizado ahora es solo un indice de busqueda.
CREATE INDEX "Player_nameKey_idx" ON "Player"("nameKey");
