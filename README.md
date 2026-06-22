# Patrulla Anti-Dengue · 3D

Juego educativo web 3D para chicos de primaria sobre **eliminación de criaderos de mosquitos** (descacharrado). Reconstrucción con **Three.js + Vite** siguiendo [`PLAN.md`](./PLAN.md).

> Estado: **Sprint 0 — "look dev"**. Pipeline visual montado (PBR · IBL · ACES · sombras suaves · GTAO · bloom) y probado con una escena de cubo + esfera. El contenido del juego viene en los próximos sprints.

## Desarrollo

```bash
npm install
npm run dev      # servidor con hot reload en http://localhost:5173
npm run build    # build de producción a dist/
npm run preview  # sirve el build
```

## Estructura

```
├── index.html              # shell mínimo (canvas + módulo)
├── vite.config.js
├── public/assets/          # models (base/heroes), textures, hdri
├── src/
│   ├── main.js             # bootstrap + escena de prueba del Sprint 0
│   ├── core/
│   │   ├── Renderer.js     # WebGLRenderer + ACES tone mapping + sombras
│   │   ├── Lighting.js     # IBL (RoomEnvironment) + key/fill/rim
│   │   ├── PostFX.js       # EffectComposer: GTAO + bloom + OutputPass
│   │   └── AssetLoader.js  # carga glTF con caché + progreso (DRACO)
│   ├── entities/  levels/  systems/  ui/  data/   # se llenan en sprints 1-4
│   └── ui/styles.css
└── prototipo-viejo/        # monolito anterior (solo para portar lógica de juego)
```

## Pipeline visual (Sprint 0)

El orden de impacto del PLAN, ya montado:

1. **Materiales PBR** — `MeshStandard` / `MeshPhysical` (no más Lambert plano).
2. **IBL / environment** — `RoomEnvironment` vía PMREM en `scene.environment` (reflejos y ambiente ricos). Se podrá cambiar por HDRI por nivel.
3. **Tone mapping** — `ACESFilmicToneMapping` aplicado por el `OutputPass`.
4. **Sombras suaves** — `PCFSoftShadowMap` con bias/normalBias seteados.
5. **Ambient Occlusion** — `GTAOPass` (contacto/peso de los objetos).
6. **Bloom sutil** — `UnrealBloomPass` de baja intensidad.

> Criterio de aceptación del PLAN: la luz se valida primero. Si la escena de prueba no se ve hermosa, se ajusta antes de pasar al contenido.

## Prototipo anterior

El juego monolítico previo (un solo `index.html` de ~2.800 líneas) quedó en
`prototipo-viejo/`. Se usa **solo** para portar la lógica de juego (spawns,
timer, escudo, Denguín, HUD) cuando lleguemos a ese sprint; la parte visual se
rehace de cero.
