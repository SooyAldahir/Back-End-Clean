/**
 * container.js — Contenedor de Inyección de Dependencias
 *
 * Implementa un contenedor DI manual (sin frameworks externos) que:
 *  1. Registra dependencias con un nombre único.
 *  2. Las resuelve de forma lazy (solo cuando se necesitan).
 *  3. Almacena singletons para evitar crear múltiples instancias.
 *
 * Patrón utilizado: Constructor Injection + Service Locator (contenedor central).
 */

class Container {
  constructor() {
    /** @type {Map<string, Function>} Fábricas registradas */
    this._factories   = new Map();
    /** @type {Map<string, any>} Instancias singleton ya creadas */
    this._singletons  = new Map();
  }

  /**
   * Registra una dependencia en el contenedor.
   * @param {string}   name      - Nombre único de la dependencia.
   * @param {Function} factory   - Función que construye la instancia: (container) => instance
   * @param {boolean}  singleton - Si true, la instancia se reutiliza (default: true).
   */
  register(name, factory, singleton = true) {
    this._factories.set(name, { factory, singleton });
    return this; // fluent API
  }

  /**
   * Resuelve (obtiene) una dependencia por nombre.
   * Si es singleton y ya fue creada, retorna la misma instancia.
   * @param {string} name
   * @returns {any}
   */
  resolve(name) {
    if (!this._factories.has(name)) {
      throw new Error(`[Container] Dependencia no registrada: "${name}"`);
    }

    const { factory, singleton } = this._factories.get(name);

    if (singleton) {
      if (!this._singletons.has(name)) {
        this._singletons.set(name, factory(this));
      }
      return this._singletons.get(name);
    }

    // Si no es singleton, crea una instancia nueva cada vez
    return factory(this);
  }

  /**
   * Alias corto de resolve().
   * @param {string} name
   */
  get(name) {
    return this.resolve(name);
  }
}

module.exports = new Container();
