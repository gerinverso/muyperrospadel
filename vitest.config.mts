import { defineConfig } from "vitest/config";

/**
 * Los tests cubren solo la logica pura (normalizacion de nombres y DNI,
 * resolucion de inscripciones, guardas de fusion). No hay tests de componentes,
 * asi que no hace falta jsdom ni el plugin de React: corren en node.
 */
export default defineConfig({
  // Resuelve el alias "@/..." leyendo el tsconfig, sin plugin extra.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
