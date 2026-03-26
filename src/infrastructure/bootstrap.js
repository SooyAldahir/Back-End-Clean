/**
 * bootstrap.js — Registro de todas las dependencias en el contenedor DI.
 *
 * IMPORTANTE: todos los require() están DENTRO de las factory functions
 * para garantizar carga lazy y evitar errores en el arranque si algún
 * módulo de infraestructura tarda en inicializarse.
 */

const container = require('./container');

// ─── Infraestructura ──────────────────────────────────────────────────────────
container.register('db',            () => require('./database/db'));
container.register('imageStorage',  () => require('./storage/image.storage'));
container.register('notifications', () => require('./notifications/firebase.provider'));

// ─── Queries ──────────────────────────────────────────────────────────────────
container.register('usuarioQueries', () => require('../domain/repositories/queries/usuario.queries'));
container.register('familiaQueries', () => require('../domain/repositories/queries/familia.queries'));
container.register('indexQueries',   () => require('../domain/repositories/queries/index.queries'));

// ─── Use Cases ────────────────────────────────────────────────────────────────
container.register('authUseCase', (c) => {
  const AuthUseCase = require('../application/use-cases/auth/auth.usecase');
  return new AuthUseCase(
    c.get('db'),
    c.get('usuarioQueries')
  );
});

container.register('familiaUseCase', (c) => {
  const FamiliaUseCase = require('../application/use-cases/familias/familia.usecase');
  return new FamiliaUseCase(
    c.get('db'),
    {
      FAMILIA_QUERIES: c.get('familiaQueries').FAMILIA_QUERIES,
      MIEMBRO_QUERIES: c.get('indexQueries').MIEMBRO_QUERIES,
    },
    c.get('imageStorage'),
    c.get('notifications')
  );
});

container.register('usuarioUseCase', (c) => {
  const UsuarioUseCase = require('../application/use-cases/usuarios/usuario.usecase');
  return new UsuarioUseCase(
    c.get('db'),
    c.get('usuarioQueries'),
    c.get('imageStorage')
  );
});

// ─── Controllers ─────────────────────────────────────────────────────────────
container.register('authController', (c) => {
  const AuthController = require('../interfaces/http/controllers/auth.controller');
  return new AuthController(c.get('authUseCase'));
});

container.register('familiaController', (c) => {
  const FamiliaController = require('../interfaces/http/controllers/familia.controller');
  return new FamiliaController(c.get('familiaUseCase'));
});

container.register('usuarioController', (c) => {
  const UsuarioController = require('../interfaces/http/controllers/usuario.controller');
  return new UsuarioController(c.get('usuarioUseCase'));
});

module.exports = container;
