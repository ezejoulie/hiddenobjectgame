import { defineConfig } from 'vite';

// Sitio estático: rutas relativas para que funcione tanto en Vercel (raíz)
// como servido desde un subdirectorio. La carpeta public/ se copia tal cual.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    host: true,
    open: false,
  },
});
