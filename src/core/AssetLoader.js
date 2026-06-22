import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * AssetLoader.js — carga de modelos glTF/glb con caché y barra de progreso.
 *
 * - Caché por URL: un mismo modelo se descarga una sola vez; las instancias
 *   se obtienen con clone().
 * - Soporta DRACO (geometría comprimida) por si el pack base lo usa.
 * - Reporta progreso agregado (0..1) para alimentar la pantalla de carga.
 *
 * En el Sprint 0 todavía no hay assets reales; esta clase queda lista para
 * el Sprint 1 cuando integremos el pack base (Quaternius/KayKit).
 */
export class AssetLoader {
  constructor({ dracoPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/' } = {}) {
    this.cache = new Map(); // url -> THREE.Group (la escena del gltf)
    this.fullCache = new Map(); // url -> {scene, animations}
    this.gltf = new GLTFLoader();

    const draco = new DRACOLoader();
    draco.setDecoderPath(dracoPath);
    this.gltf.setDRACOLoader(draco);
    this.draco = draco;
  }

  /** Carga un gltf completo (escena + animaciones). Para personajes riggeados. */
  loadGLTF(url) {
    if (this.fullCache.has(url)) return Promise.resolve(this.fullCache.get(url));
    return new Promise((resolve, reject) => {
      this.gltf.load(
        url,
        (gltf) => {
          const data = { scene: gltf.scene, animations: gltf.animations || [] };
          this.fullCache.set(url, data);
          this.cache.set(url, gltf.scene);
          resolve(data);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  /** Carga (o devuelve de caché) un gltf. Resuelve con la escena cruda. */
  load(url) {
    if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));
    return new Promise((resolve, reject) => {
      this.gltf.load(
        url,
        (gltf) => {
          this.cache.set(url, gltf.scene);
          resolve(gltf.scene);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  /** Devuelve una instancia clonada lista para agregar a la escena, o null. */
  instance(url) {
    const base = this.cache.get(url);
    return base ? base.clone(true) : null;
  }

  /**
   * Precarga una lista de URLs reportando progreso agregado.
   * Cada item resuelve aunque falle (no traba la barra).
   * @param {string[]} urls
   * @param {(p:number)=>void} onProgress  p en 0..1
   */
  async preload(urls, onProgress) {
    const total = urls.length || 1;
    let done = 0;
    onProgress?.(0);
    await Promise.all(
      urls.map((url) =>
        this.load(url)
          .catch(() => null)
          .then(() => {
            done += 1;
            onProgress?.(done / total);
          })
      )
    );
    onProgress?.(1);
  }

  dispose() {
    this.draco.dispose();
    this.cache.clear();
  }
}
