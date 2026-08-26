# Landing nueva — direcciones

Canvas publicado: https://claude.ai/code/artifact/d3e2f55a-e3b4-4cb3-872a-bc4bece2a198

Tres direcciones para la landing de club (hero del próximo torneo → cómo funciona →
ranking → torneos → cierre), más el mobile de la recomendada. Los datos son de muestra;
la estructura sigue el modelo real (`TournamentStatus`, ranking por temporada, inscripción
por pareja) y los colores y tipografías salen de `src/app/globals.css`.

| Archivo | Artboard |
|---|---|
| `Main.dc.html` | A · Editorial de club (recomendada) |
| `DirectionB.dc.html` | B · Scoreboard |
| `DirectionC.dc.html` | C · Nocturno mínimo |
| `MobileA.dc.html` | A en 390px |
| `canvas.json` | posiciones, títulos y notas del canvas |

Los filtros de estado funcionan dentro de cada artboard (state en `DCLogic`).

## Regenerar el canvas

El `.html` publicado no se versiona (2,5 MB de editor embebido). Se rearma desde
estos archivos con la skill `/design`:

```
node "<base de la skill design>/seed-canvas.mjs" \
  --template "<base de la skill design>/payload.template.html" \
  --out design/landing/landing-muy-perros-padel.html \
  --title "Landing Muy Perros Pádel" \
  --artboard design/landing/Main.dc.html \
  --artboard design/landing/DirectionB.dc.html \
  --artboard design/landing/DirectionC.dc.html \
  --artboard design/landing/MobileA.dc.html \
  --image design/landing/logo.jpg \
  --canvas design/landing/canvas.json
```

`logo.jpg` es `public/logo.jpg` reducido a 400×400 (el original de 345 KB no entra
en el canvas, que republica el documento completo en cada guardado).
