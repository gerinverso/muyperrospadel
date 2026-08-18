# Muy Perros Pádel

Web para organizar torneos de pádel entre amigos, en 3 etapas:

1. **Jugadores y sorteo**: el organizador carga los nombres de los participantes, la app sortea las parejas al azar, y calcula el premio a partir de lo que pone cada jugador de inscripción menos el costo de las canchas.
2. **Cuadro**: a partir de las parejas, se arma el cruce de eliminación directa por sorteo. Solo los administradores pueden marcar qué pareja avanza en cada partido.
3. **Vista pública**: cualquiera con el link puede ver el estado del torneo, el cuadro y los resultados en tiempo real (sin necesidad de iniciar sesión).

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

- `prisma/schema.prisma`: modelos de datos (Torneo, Jugador, Pareja, Partido).
- `src/lib/bracket.ts`: lógica de sorteo de parejas y armado del cuadro de eliminación directa (incluye manejo de "byes" cuando la cantidad de parejas no es potencia de 2).
- `src/lib/auth.ts`: sesión de administrador y verificación de credenciales.
- `src/app/admin/*`: panel de administración (protegido por login).
- `src/app/torneos/[id]`: vista pública del torneo.
