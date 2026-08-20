# Anuncio de torneo, auto-inscripción con DNI e identidad de jugadores

Fecha: 2026-08-20

## Problema

Hoy los jugadores los carga el administrador a mano y la identidad de una
persona **es su nombre normalizado**: `Player.nameKey` es `@unique` y todos los
flujos hacen `upsert` contra esa clave. Eso trae dos límites:

1. No hay forma de anunciar un torneo próximo ni de que un jugador se anote
   solo. El torneo no tiene fecha de inicio ni estado de inscripciones.
2. El sistema **no puede representar dos homónimos**. Y como los jugadores
   viejos no tienen DNI, cuando esas mismas personas se auto-inscriban van a
   quedar como registros separados del histórico.

## Objetivo

- Un anuncio visible al entrar a la web, con cuenta regresiva, para el torneo
  con inscripciones abiertas.
- Que cada jugador se inscriba solo con **DNI + nombre**.
- Mover la identidad de "nombre" a "DNI", sin perder el historial ni el ranking
  de los jugadores ya cargados.

## Decisiones tomadas

| Decisión | Elegido | Descartado |
|---|---|---|
| Colisión de nombre al inscribirse | **Siempre crear jugador nuevo** + cola de duplicados para el admin | Auto-vincular por nombre; pedirle confirmación al jugador |
| Datos del formulario | **Solo DNI + nombre** | Sumar teléfono / categoría |
| Cómo se anuncia | **`startsAt` + flag `registrationOpen`** | Flag manual sin fecha; solo fecha |
| DNI de los jugadores viejos | **Solo por fusión** en el admin | Carga manual en el listado |
| Cupo | **Sin límite** | Cupo con corte seco; lista de espera |
| Baja del jugador | **Solo el admin** | Auto-baja con DNI |
| Acentos | **`nameKey` siempre sin acentos**, con backfill | Dejar la normalización actual |
| Endpoint público | **Sin verificación**, solo validación de formato | Rate limit, captcha, token |

Principio rector: **la inscripción pública nunca modifica registros
existentes**. Solo crea, o reutiliza un registro cuyo DNI coincide exacto.
Toda unificación es una acción explícita del administrador.

## Arquitectura

### 1. Cambios de schema

```prisma
model Tournament {
  startsAt         DateTime?  // fecha de inicio; sin ella no hay cuenta regresiva
  registrationOpen Boolean    @default(false)
}

model Player {
  nameKey String   // deja de ser @unique
  dni     String?  @unique   // sin cambios

  @@index([nameKey])
}
```

`dni` sigue siendo opcional: los jugadores históricos que nunca vuelvan a
anotarse se quedan sin DNI y no molestan.

### 2. Migración SQL

Un solo archivo de migración, en este orden:

1. `ALTER TABLE "Tournament"` — agrega `startsAt` (nullable) y
   `registrationOpen` (`NOT NULL DEFAULT false`).
2. `DROP INDEX "Player_nameKey_key"` y `CREATE INDEX "Player_nameKey_idx"`.
3. Backfill de `nameKey`: se recalcula desde `name` con la normalización nueva
   (minúsculas, espacios colapsados, **sin acentos**).

El orden importa: el backfill puede generar `nameKey` repetidos, así que el
índice único tiene que caer antes.

Para sacar acentos se usa `translate()` y no la extensión `unaccent`, que puede
no estar instalada en el Postgres hosteado:

```sql
UPDATE "Player"
SET "nameKey" = lower(
  translate(
    regexp_replace(btrim("name"), '\s+', ' ', 'g'),
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
  )
);
```

**Efecto conocido y buscado**: la migración
`20260819120000_global_players_and_ranking` desambiguó a la fuerza los
homónimos que caían dentro de un mismo torneo, dejándoles
`nameKey = "juan perez #<id>"`. Al recalcular desde `name` esos sufijos
desaparecen y esos jugadores vuelven a agruparse como duplicados. Es lo
correcto: quedan visibles en la cola del admin, y la guarda de "mismo torneo"
(§5) va a impedir que se fusionen por error.

El `name` visible **no se toca**: se guarda tal cual lo escribió la persona.

### 3. Normalización (`src/lib/players.ts`)

`normalizeName` pasa a sacar acentos:

```ts
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "") // saca los diacriticos que dejo NFD
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
```

`normalizeDni` y `formatDni` quedan como están.

### 4. Consecuencia obligatoria: los upserts por nombre se rompen

Sacar el `@unique` invalida `where: { nameKey }` en operaciones que exigen
clave única. Hay que reescribir dos lugares:

**`src/app/api/tournaments/[id]/players/route.ts`** — carga de nombres a mano
del admin. El `prisma.player.upsert({ where: { nameKey } })` pasa a
`findMany({ where: { nameKey } })`:

- 1 coincidencia → la reutiliza (comportamiento de hoy).
- 0 coincidencias → crea el jugador.
- 2 o más → **error 409** pidiendo que lo elija del listado. No puede adivinar
  entre homónimos.

**`src/app/api/players/route.ts`** — alta manual del admin. `findUnique` pasa a
`findFirst`. Si el nombre ya existe:

- sin DNI en el body → sigue el 409 de hoy ("Ya existe un jugador llamado X").
- con un DNI que no está en uso → **deja crear**: es un homónimo verificado.

### 5. Inscripción pública

`POST /api/tournaments/[id]/register` — **sin `ensureAdmin`**.

Body `{ dni, name }` validado con zod (ya está en dependencias):
DNI de 7 a 9 dígitos una vez normalizado, nombre no vacío.

Precondiciones, si no se cumplen responde 409:

- el torneo existe,
- `registrationOpen === true`,
- `status === "SETUP"`.

Resolución de identidad:

1. `findUnique({ where: { dni } })` → si existe, **se usa ese jugador**. El
   nombre no se pisa: manda lo que ya está cargado.
2. Si no existe → **se crea un jugador nuevo**, aunque el `nameKey` ya exista.
3. Si el jugador ya está anotado en ese torneo → responde 200 sin duplicar
   (idempotente, para el doble click).
4. Conecta el jugador al torneo y responde `{ name, alreadyRegistered }`.

Riesgo aceptado: el endpoint es público y sin verificación, así que cualquiera
puede anotar a otro con un DNI inventado. Aceptable para el tamaño del club.
Solo se valida formato.

### 6. Fusión de duplicados

Es el mecanismo por el que los jugadores viejos terminan teniendo DNI.

**`GET /api/players/duplicates`** (admin) — devuelve los grupos de jugadores que
comparten `nameKey`, con su DNI, cantidad de torneos y fecha de alta, para
poder decidir cuál conservar. Los grupos que chocan con alguna de las guardas de
abajo se devuelven igual, pero marcados como no fusionables y con el motivo:
esconderlos daría a entender que no hay nada que revisar.

**`POST /api/players/merge`** (admin) — body `{ keepId, mergeId }`, todo en una
transacción:

1. Mueve las inscripciones a torneos de `mergeId` a `keepId`, salteando las que
   ya existan.
2. Reasigna `pairsAsPlayer1` y `pairsAsPlayer2`.
3. Si `keepId` no tiene DNI y `mergeId` sí, lo hereda.
4. Borra `mergeId`.

Dos guardas que **bloquean la fusión** con un 409 explicativo:

- **Ambos tienen DNI distinto** → no son la misma persona.
- **Ambos participaron del mismo torneo** → violaría
  `@@unique([tournamentId, player1Id])` de `Pair`, y además implica que son dos
  personas distintas. El error nombra el torneo en conflicto.

El ranking se corrige solo: `computeRanking` en `src/lib/ranking.ts` agrupa por
`player.id` leyendo las parejas, así que reasignar `Pair` alcanza.

### 7. Control de inscripciones (admin)

**`POST /api/tournaments/[id]/registration`** — body
`{ startsAt, registrationOpen }`. Se sigue el patrón de endpoint-por-acción que
ya usa `finance/route.ts`; el repo no tiene un PATCH genérico de torneo.

Abrir inscripciones exige que el torneo esté en `SETUP`. Cerrarlas **no cambia
el status**: el torneo sigue en `SETUP` y el sorteo se dispara igual que hoy
desde `draw-pairs`. Cerrar solo apaga el banner y el endpoint público.

### 8. Interfaz

**Banner de anuncio** — componente server nuevo, montado en `layout.tsx` arriba
del `Navbar`, visible en toda la web. Consulta el torneo con
`registrationOpen: true` y `status: "SETUP"`, ordenado por `startsAt` ascendente
con los nulos al final (`nulls: "last"`), tomando el primero. Muestra el nombre,
la cuenta regresiva y un botón **Inscribirme**. Si no hay ninguno, no renderiza
nada. Un torneo con inscripciones abiertas y sin `startsAt` se anuncia igual,
sin contador: la fecha es opcional y no debe ocultar el anuncio.

La cuenta regresiva se calcula en días con el huso de Argentina, reutilizando el
offset fijo `ARGENTINA_UTC_OFFSET_HOURS` de `ranking.ts`, porque Vercel corre en
UTC. Casos: falta más de un día → "Faltan N días"; es hoy → "¡Es hoy!"; ya pasó
pero sigue abierto → "Inscripción abierta", sin contador.

**`/torneos/[id]/inscripcion`** — página con el formulario (DNI + nombre),
estados de carga y error, y pantalla de confirmación. Si las inscripciones están
cerradas muestra el aviso en vez del formulario.

**`AdminTournamentPanel.tsx`** — sección nueva con la fecha de inicio y el botón
de abrir/cerrar inscripciones, además de un contador de inscriptos.

**`/admin/jugadores`** — sección "Posibles duplicados" con los grupos detectados
y el botón de fusión, más un buscador para fusionar dos jugadores cualesquiera
elegidos a mano (cubre los casos que el nombre no detecta, tipo "Mati Pavoni"
contra "Matias Pavoni").

## Testing

El proyecto no tiene framework de tests. Se agrega **vitest**, con cobertura
acotada a la lógica pura, que es donde viven los bugs sutiles de este cambio:

- `normalizeName`: acentos, mayúsculas, espacios de más, cadena vacía.
- `normalizeDni`: puntos, espacios, vacío, no numérico.
- Resolución de identidad de la inscripción, extraída a una función pura que
  recibe el estado de la base y devuelve la acción a tomar (`reuse` / `create` /
  `already-registered`).
- Validación de las guardas de fusión (DNI distinto, torneo compartido), también
  como función pura sobre los datos ya cargados.

El resto —banner, panel de admin, la transacción de fusión y la migración SQL—
se verifica a mano contra la base. La migración se prueba sobre una copia antes
de correrla en producción.

## Fuera de alcance

- Cupo máximo y lista de espera.
- Auto-baja del jugador.
- Teléfono, categoría o cualquier dato extra del jugador.
- Rate limiting o verificación de identidad en el endpoint público.
- Notificaciones al jugador.
