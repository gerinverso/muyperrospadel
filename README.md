# Muy Perros Pádel

Web para organizar torneos de pádel entre amigos, en 3 etapas:

1. **Jugadores y sorteo**: el organizador anota a los participantes (eligiéndolos del listado del club o cargando alguno nuevo), la app sortea las parejas al azar, y calcula el premio a partir de lo que pone cada jugador de inscripción menos el costo de las canchas.
2. **Cuadro**: a partir de las parejas, se arma el cruce de eliminación directa por sorteo. Solo los administradores pueden marcar qué pareja avanza en cada partido.
3. **Vista pública**: cualquiera con el link puede ver el estado del torneo, el cuadro y los resultados en tiempo real (sin necesidad de iniciar sesión).

Además tiene:

- **Listado de jugadores del club**: los jugadores se guardan en la base y se reutilizan en todos los torneos. Cada uno tiene un identificador único y un campo de DNI (hoy opcional, pensado para pasar a ser el identificador definitivo).
- **Ranking por temporada**: tabla pública de puntos por jugador, que se arma sola con los resultados de los torneos terminados del año.

## Ranking: cómo se suman los puntos

Los puntos se asignan según hasta dónde llegó cada pareja, y **los dos integrantes suman el total** (no se divide entre los dos).

| Instancia | Puntos |
| --- | ---: |
| Campeón | 100 |
| Subcampeón | 70 |
| Semifinalista | 50 |
| Cuartos de final | 30 |
| Octavos de final | 15 |
| Eliminado en zona (3er puesto o mejor) | 10 |
| Participación (4to puesto o peor) | 5 |

Detalles de cómo se aplica:

- Sólo cuentan los torneos **terminados** (los que ya tienen campeón). Un torneo en curso no mueve el ranking.
- La temporada es el año en que se creó el torneo, y el ranking arranca de cero cada año.
- En un torneo con zonas, la pareja que clasifica puntúa por la ronda a la que llegó en el cuadro; la que queda afuera en la zona puntúa por su puesto en la tabla de su zona.
- Si el cuadro es más chico, las instancias se cuentan desde la final hacia atrás: en un cuadro de 8 parejas la primera ronda son los cuartos, en uno de 4 son las semis.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma 7 + PostgreSQL (adaptador `@prisma/adapter-pg`)
- Sesión de administrador con `iron-session` (cookie firmada) y credenciales en variables de entorno

## Requisitos previos

- Node.js 18+
- Una base PostgreSQL (para desarrollo local se puede usar `npx prisma dev`, que levanta una base temporal en tu máquina)

## Configuración

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env` y completar las variables:

   - `DATABASE_URL`: cadena de conexión a Postgres.
   - `ADMIN_USERS`: lista de administradores en formato `usuario:contraseña`, separados por coma. Ejemplo:

     ```
     ADMIN_USERS="agustin:unaClaveSegura,german:otraClaveSegura"
     ```

   - `SESSION_PASSWORD`: cadena aleatoria de al menos 32 caracteres (usada para firmar la cookie de sesión).

   ⚠️ **Importante**: cambiar las contraseñas de ejemplo antes de compartir la app con nadie.

3. Levantar una base de datos local (si no tenés una en la nube todavía):

   ```bash
   npx prisma dev -d
   ```

   Esto imprime una `DATABASE_URL` de una base Postgres local — copiarla al `.env`.

4. Aplicar el esquema de la base de datos:

   ```bash
   npx prisma migrate dev
   ```

5. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

## Uso

- **Administradores** (Agustín y German): entrar por el botón "Administrador" en la home, o directamente en `/admin/login`, con el usuario/contraseña configurados en `ADMIN_USERS`. Desde `/admin` se crean torneos y se gestiona cada uno (jugadores, sorteo, montos, cuadro y resultados).
- **Resto de los jugadores**: acceden directamente al link público de cada torneo (`/torneos/[id]`) para ver el sorteo, el cuadro y los resultados a medida que se juegan.

## Poner esto en producción (para que todos lo vean desde internet)

La forma más simple es desplegar en [Vercel](https://vercel.com):

1. Crear una base Postgres en la nube gratis, por ejemplo con `npx create-db` (Prisma Postgres) o en [Neon](https://neon.tech) / [Supabase](https://supabase.com).
2. Subir este proyecto a un repositorio de GitHub.
3. Importarlo en Vercel y configurar las variables de entorno (`DATABASE_URL`, `ADMIN_USERS`, `SESSION_PASSWORD`) en la configuración del proyecto.
4. Correr `npx prisma migrate deploy` apuntando a la base de producción (una sola vez, para crear las tablas).

## Estructura relevante

- `prisma/schema.prisma`: modelos de datos (Torneo, Jugador, Pareja, Zona, Partido). El jugador es global: se relaciona con los torneos en los que participó.
- `src/lib/bracket.ts`: lógica de sorteo de parejas y armado del cuadro de eliminación directa (incluye manejo de "byes" cuando la cantidad de parejas no es potencia de 2).
- `src/lib/groups.ts`: reparto de zonas, fixture todos contra todos y tabla de posiciones.
- `src/lib/ranking.ts`: puntaje por instancia y armado del ranking por temporada.
- `src/lib/players.ts`: normalización de nombres y DNI para no duplicar jugadores.
- `src/lib/auth.ts`: sesión de administrador y verificación de credenciales.
- `src/app/admin/*`: panel de administración (protegido por login), incluido el listado de jugadores del club en `/admin/jugadores`.
- `src/app/torneos/[id]`: vista pública del torneo.
- `src/app/ranking`: ranking público por temporada.

## Base de datos: desarrollo vs producción

`DATABASE_URL` en `.env` apunta a la base **de producción** (Supabase). Para trabajar en local sin tocar los datos reales, levantá una base descartable y usala sólo para ese comando:

```bash
npx prisma dev -d            # imprime la URL de una base local
DATABASE_URL="<url-local>" npm run dev
```

Las migraciones nuevas se aplican con:

```bash
npx prisma migrate deploy    # usa la DATABASE_URL configurada
```

### Conexión a Supabase: `uselibpqcompat=true`

La `DATABASE_URL` de Supabase tiene que incluir `uselibpqcompat=true` además de `sslmode=require`:

```
postgresql://usuario:clave@...pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require
```

Sin ese parámetro, la versión actual del driver `pg` interpreta `sslmode=require` como
`verify-full` y rechaza el certificado autofirmado del pooler de Supabase, con lo que la
app no puede conectarse a la base (`TlsConnectionError`). La conexión sigue siendo cifrada.

**Importante**: este mismo valor tiene que estar en las variables de entorno del deploy
(por ejemplo en Vercel), no alcanza con cambiarlo en el `.env` local.
