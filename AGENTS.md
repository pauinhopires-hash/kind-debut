# Project Rules

- Keep the TanStack Start server entry statically imported so production bundles all runtime modules together.
- vite.config.ts: `ssr.noExternal: true` somente em `command === "build"` — o edge runtime nao resolve modulos em execucao (h3-v2 causava 502); no dev isso quebra o module runner do Vite (react CJS).
