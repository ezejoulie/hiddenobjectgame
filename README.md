# Patrulla Anti-Dengue 3D · ¡A descacharrar!

Juego 3D educativo hecho con [three.js](https://threejs.org/): recorré el mundo, encontrá los cacharros que juntan agua y frená al mosquito del dengue.

## Cómo jugar

- **Objetivo:** encontrar los 10 cacharros con agua de cada nivel antes de que se acabe el tiempo (2 minutos).
- **5 niveles:** La Casa, El Jardín, La Escuela, El Parque y La Playa.
- **Cuidado con Denguín:** el mosquito villano te persigue; activá el escudo para defenderte. Si te pica, ¡los cacharros se dispersan!

### Controles

| Acción | Teclado (desktop) | Táctil (mobile) |
|---|---|---|
| Caminar | WASD / flechas | Joystick (abajo a la izquierda) |
| Mirar | Arrastrar con el mouse | Arrastrar sobre la escena |
| Defenderse | Espacio | Botón 🛡️ DEFENDERSE (abajo a la derecha) |

En celulares y tablets el juego se juega **en horizontal**: si el dispositivo está en vertical aparece un aviso para girarlo y la partida queda pausada hasta volver a horizontal. Al empezar a jugar se intenta pasar a pantalla completa y bloquear la orientación apaisada (en los navegadores que lo permiten).

### Pantalla completa en iPhone/iPad

Safari de iOS no permite forzar pantalla completa desde la web. El juego es una **PWA instalable**: tocá **Compartir → Agregar a pantalla de inicio** y abrilo desde el ícono; se ve a pantalla completa real, sin barras del navegador. (El propio juego muestra este tip en la pantalla de inicio cuando detecta un iPhone sin instalar.)

## Stack

- HTML/CSS/JS en un solo archivo (`index.html`), sin build.
- three.js r128 desde CDN.
- Sonido y música generados con WebAudio (sin archivos de audio).

## Desarrollo local

```bash
npx serve .
```

y abrir http://localhost:3000

## Deploy

Sitio estático: cualquier hosting sirve. Está conectado a Vercel, que detecta el `index.html` en la raíz sin configuración extra.

---

*Sin agua acumulada, no hay mosquito. Sin mosquito, no hay dengue.* 🦟
