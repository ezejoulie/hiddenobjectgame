# Patrulla Anti-Dengue 3D · ¡A descacharrar!

Juego 3D educativo hecho con [three.js](https://threejs.org/): recorré el mundo, encontrá los cacharros que juntan agua y frená al mosquito del dengue.

## Cómo jugar

- **Objetivo:** encontrar los 10 cacharros con agua de cada nivel antes de que se acabe el tiempo (2 minutos).
- **5 niveles:** La Casa, El Jardín, La Escuela, El Parque y La Playa.
- **Cuidado con Denguín:** el mosquito villano te persigue; activá el escudo para defenderte. Si te pica, ¡los cacharros se dispersan!

### Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Caminar | WASD / flechas | Joystick |
| Mirar | Arrastrar con el mouse | Arrastrar |
| Escudo | Espacio | Botón 🛡️ |

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
