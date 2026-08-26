# Landing nueva — dirección B (scoreboard)

Canvas publicado: https://claude.ai/code/artifact/d3e2f55a-e3b4-4cb3-872a-bc4bece2a198

Landing de club completa: hero del próximo torneo → cómo funciona → ranking →
torneos → cierre. Dirección elegida: **scoreboard** — el marcador manda, grilla
dura de líneas de 1px, slab lime con la cuenta regresiva, ranking y torneos como
tablas densas, cero glow y cero radios.

Los colores, tipografías, espaciados y radios salen de `src/app/globals.css`;
la estructura sigue el modelo real (`TournamentStatus`, ranking por temporada,
inscripción por pareja). Nombres, fechas, precios y puntos son de muestra.

| Archivo | Artboard | Página del canvas |
|---|---|---|
| `Main.dc.html` | Landing · desktop 1440 | Landing |
| `MobileB.dc.html` | Landing · mobile 390 | Landing |
| `DirectionA.dc.html` | A · Editorial de club (descartada) | Descartadas |
| `DirectionC.dc.html` | C · Nocturno mínimo (descartada) | Descartadas |
| `canvas.json` | páginas, posiciones, títulos y notas | — |

Interacciones que funcionan dentro de los artboards (state en `DCLogic`):

- filtros de estado de la tabla de torneos
- selector de temporada del ranking (2026 / 2025)

En mobile la tabla del ranking se desplaza de costado con la misma solución que
ya usa `src/app/ranking/page.tsx` (`min-width` + aviso arriba).

## Regenerar el canvas

El `.html` publicado no se versiona (2,5 MB de editor embebido). Se rearma desde
estos archivos con la skill `/design`:

```
node "<base de la skill design>/seed-canvas.mjs" \
  --template "<base de la skill design>/payload.template.html" \
  --out design/landing/landing-muy-perros-padel.html \
  --title "Landing Muy Perros Pádel" \
  --artboard design/landing/Main.dc.html \
  --artboard design/landing/MobileB.dc.html \
  --artboard design/landing/DirectionA.dc.html \
  --artboard design/landing/DirectionC.dc.html \
  --image design/landing/logo.jpg \
  --canvas design/landing/canvas.json
```

`logo.jpg` es `public/logo.jpg` reducido a 400×400 (el original de 345 KB no entra
en el canvas, que republica el documento completo en cada guardado).

## Pendiente para implementar en Next

- Estado vacío de la tabla de torneos cuando un filtro no devuelve nada
  (la home actual ya lo tiene; en el prototipo no se puede ver porque todos los
  filtros tienen resultados).
- Menú mobile: el botón está dibujado pero no abre nada en el prototipo; en la
  app ya existe en `src/components/Navbar.tsx`.
