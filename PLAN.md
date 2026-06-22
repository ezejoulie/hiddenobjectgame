# Patrulla Anti-Dengue — Plan de Reconstrucción
### Documento de arranque para Claude Code

> **Para quién es esto:** este documento es el brief que Claude Code va a leer para construir el juego desde cero, con buena base. No es código: es el plan, la arquitectura y los estándares de calidad. Pegalo en el repo como `PLAN.md` y pedile a Claude Code que lo siga.

---

## 1. Qué es el juego

Juego educativo web 3D para chicos de primaria sobre **eliminación de criaderos de mosquitos** (descacharrado). El jugador recorre ambientes en tercera persona, encuentra y elimina los 10 "cacharros" (recipientes con agua estancada) de cada nivel antes de que se acabe el tiempo, esquivando a **Denguín** (el mosquito villano).

- **5 niveles:** La Casa (interior) · El Jardín · La Escuela · El Parque · La Playa
- **10 criaderos por nivel**, timer de 2:00, escudo anti-Denguín de doble defensa
- **Distribución:** se juega por link en el navegador (clave para llegar a escuelas, sin instalar nada)
- **Estilo objetivo:** estilizado tipo Pixar / Zelda BOTW — NO fotorrealista, sí *encantador y consistente*
- **Cliente del deck comercial:** laboratorio Raquelda

---

## 2. La decisión técnica (y por qué)

### Camino elegido: **Web estilizado con Three.js + assets game-ready + iluminación de verdad**

El problema de la versión anterior no era la perspectiva ni la cantidad de muebles. Eran **dos causas raíz**:

1. **Assets autogenerados (Higgsfield image-to-3D):** geniales como render 2D para el deck, pero como geometría de juego son de baja calidad — malla sucia, **la luz horneada dentro de la textura** (por eso el piso titilaba y se veía "patchwork" al relumbrarlo), sin mapas PBR. Construíamos con materiales que peleaban.
2. **Iluminación pobre:** `MeshLambertMaterial` plano, sin ambient occlusion, sin reflejos, sin post-procesado. **El 80% del "wow" visual de cualquier juego es la luz**, y no la teníamos.

### Estrategia de assets: **mezcla**
- **Pack base estilizado game-ready** para todo lo estructural y de relleno: muebles, props, vegetación, edificios. Candidatos: **Quaternius** (CC0, gratis, low-poly Pixar-ish, ideal web), **KayKit** (dungeon/furniture/city packs estilizados), **Synty POLYGON** (pago, altísima calidad, exportable a glTF). → Esto resuelve de un saque el "se ve vacío / mal armado".
- **Higgsfield puntual** solo para los **héroes** que necesitan identidad propia: Mateo (protagonista), Denguín (villano), y quizás 2-3 cacharros característicos. Estos sí justifican el asset custom.

### Lo que NO necesitamos
- **No necesitamos servidores ni "online" para el look.** El look es 100% render local (la placa de video del que juega). El "online" de CoD/WoW es netcode (sincronizar estado entre jugadores), un problema separado que este juego no tiene.

---

## 3. El salto de calidad visual: el checklist técnico

Esto es lo que cierra la brecha entre "lo que teníamos" y "el render del que te enamoraste". En orden de impacto:

| # | Técnica | Qué arregla | Three.js |
|---|---------|-------------|----------|
| 1 | **Materiales PBR** (`MeshStandardMaterial`/`MeshPhysicalMaterial`) | Todo se ve plano y de plástico | Reemplazar Lambert; usar mapas albedo + normal + roughness |
| 2 | **Environment map / IBL** | Sin reflejos ni luz ambiental rica | `RoomEnvironment` o un HDRI; `scene.environment` |
| 3 | **Tone mapping + exposición** | Colores quemados o lavados | `ACESFilmicToneMapping` en el renderer |
| 4 | **Sombras suaves** | Sombras duras o ausentes | `PCFSoftShadowMap`, bias bien seteado |
| 5 | **Ambient Occlusion (SSAO/GTAO)** | Objetos "flotando", sin contacto | Post-proceso vía `EffectComposer` |
| 6 | **Bloom sutil** | Falta de "vida" en luces y brillos | `UnrealBloomPass`, intensidad baja |
| 7 | **Assets game-ready** | Geometría sucia, texturas con luz horneada | Pack base, glTF limpio con PBR |
| 8 | **Iluminación horneada (lightmaps)** | GI en tiempo real es caro en web | Hornear en Blender para escenas estáticas |
| 9 | **Color grading / LUT** | Falta cohesión de paleta (look "Pixar") | LUT pass al final del pipeline |

> Regla de oro: **un buen asset mal iluminado se ve mal; un asset simple bien iluminado se ve hermoso.** Priorizar luz sobre detalle de malla.

---

## 4. Arquitectura del proyecto (multi-archivo, en Claude Code)

Salir del `index.html` monolítico de 2800 líneas. Estructura propuesta (Vite + Three.js):

```
patrulla-antidengue/
├── index.html                  # shell mínimo
├── package.json                # vite, three, (opcional) @react-three si se quiere
├── vite.config.js
├── public/
│   └── assets/
│       ├── models/             # .glb del pack base + héroes Higgsfield
│       │   ├── base/           # muebles, props, vegetación (pack)
│       │   └── heroes/         # mateo.glb, denguin.glb, cacharros custom
│       ├── textures/           # PBR maps, lightmaps horneados
│       └── hdri/               # environment para IBL
├── src/
│   ├── main.js                 # bootstrap: renderer, loop, escena
│   ├── core/
│   │   ├── Renderer.js         # renderer + tone mapping + post-proceso
│   │   ├── Lighting.js         # setup de luz reutilizable (key/fill/rim + IBL)
│   │   ├── PostFX.js           # EffectComposer: SSAO, bloom, LUT
│   │   ├── AssetLoader.js      # carga glTF con caché + barra de progreso
│   │   └── Input.js            # teclado/touch/joystick
│   ├── entities/
│   │   ├── Player.js           # Mateo: movimiento 3ra persona, escudo
│   │   ├── Denguin.js          # IA del villano, ataque, esquive
│   │   └── Cacharro.js         # criadero recogible (10 tipos)
│   ├── levels/
│   │   ├── Level.js            # clase base: spawns, colliders, timer, HUD
│   │   ├── Casa.js             # interior — 5 ambientes
│   │   ├── Jardin.js
│   │   ├── Escuela.js
│   │   ├── Parque.js
│   │   └── Playa.js
│   ├── systems/
│   │   ├── Collision.js        # colliders rectangulares/circulares
│   │   ├── Camera.js           # cámara 3ra persona con anti-clipping de paredes
│   │   └── Rain.js             # lluvia (solo exteriores)
│   ├── ui/
│   │   ├── HUD.js              # timer, contador, ítems
│   │   ├── Screens.js         # menú, carga, victoria/derrota
│   │   └── styles.css
│   └── data/
│       └── levels.config.js    # spawns, ítems, descripciones por nivel
└── PLAN.md                     # este documento
```

**Beneficios sobre el monolito:** hot reload (ves cambios al instante), git con historial, cada sistema testeable por separado, y Claude Code puede trabajar archivo por archivo sin tocar 2800 líneas de golpe.

---

## 5. Diseño de cada nivel (lo que ya validamos)

### La Casa — interior, tercera persona, ~180-200 m²
**Aprendizaje clave de las iteraciones:** la casa NO puede ser gigante (teníamos 1300 m², por eso todo se veía perdido). Tamaño realista, ambientes compactos y **llenos**.

5 ambientes, cada uno equipado de verdad:
- **Cocina:** mesada con bacha, heladera, alacena, estante, mesa con sillas
- **Baño:** bañadera, inodoro, bacha con espejo, toallero, alfombrita
- **Lavadero:** lavarropas, pileta, tendedero con ropa, estante con productos, canasto
- **Dormitorio:** cama, mesa de luz, ropero, alfombra, cuadro
- **Living (centro):** sofá, mesa ratona, TV, biblioteca, alfombra, lámpara, planta

**Cámara:** tercera persona (NO cenital — descartado). Necesita **anti-clipping de paredes**: cuando el jugador se acerca a una pared, la cámara hace raycast y se acerca para no atravesarla.

**Piso:** una sola capa por ambiente con material PBR + textura tileable real (NO instancias GLB tileadas → eso causaba el patchwork; NO dos capas solapadas → eso causaba el z-fighting/titileo).

### Niveles 2-5 (exteriores)
Jardín, Escuela, Parque, Playa. Cada uno con su paleta, su cielo (HDRI/equirect), y vegetación/props del pack base. La Playa tiene anochecer progresivo. Lluvia ocasional **solo en exteriores**.

---

## 6. Reglas de juego (constantes)

- 10 criaderos por nivel, hay que eliminarlos todos
- Timer 2:00 por nivel
- Denguín: si te pica, los cacharros se dispersan (penalización). Activás escudo de doble defensa para protegerte
- El orden de los ítems del HUD debe coincidir con el orden de spawn (lección aprendida: tenían que estar sincronizados)
- Tono educativo: mensajes que enseñan sobre prevención del dengue

---

## 7. Roadmap sugerido para Claude Code

**Sprint 0 — Esqueleto y "look dev"**
1. Scaffold Vite + Three.js, estructura de carpetas
2. `Renderer.js` + `Lighting.js` + `PostFX.js`: montar el pipeline visual ANTES que el contenido. Probar con un cubo y una esfera hasta que se vean hermosos. *Este es el paso que más impacta.*
3. `AssetLoader.js` con barra de progreso

**Sprint 1 — Jugador y una sala**
4. Integrar pack base de assets (descargar Quaternius/KayKit)
5. `Player.js` (Mateo, movimiento 3ra persona) + `Camera.js` con anti-clipping
6. Construir SOLO el living de La Casa, bien iluminado y lleno → validar el look contra el render objetivo

**Sprint 2 — La Casa completa**
7. Los 5 ambientes, colliders, criaderos, Denguín, HUD, timer

**Sprint 3 — Niveles exteriores**
8. Jardín, Escuela, Parque, Playa con el pack base + lluvia + cielos

**Sprint 4 — Pulido y héroes**
9. Reemplazar placeholders por los héroes Higgsfield (Mateo, Denguín)
10. Color grading final, audio, pantallas de victoria/derrota, deploy a Vercel

> **Criterio de aceptación del Sprint 0+1:** si el living solo, bien iluminado, no te parece hermoso, no se sigue hasta arreglarlo. La luz se valida primero.

---

## 8. Qué llevamos de lo ya hecho

- **Lógica de juego** (spawns, timer, escudo, Denguín, HUD): portar del prototipo, ya funcionaba
- **Imágenes del deck** (6 renders 16:9 de Higgsfield): se quedan para el material comercial de Raquelda, NO como geometría
- **Aprendizajes de tamaño y cámara:** casa ~180m², tercera persona, anti-clipping, piso de una capa
- **Assets héroes Higgsfield:** Mateo y Denguín se pueden reusar/regenerar como custom
