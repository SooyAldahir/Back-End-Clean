/**
 * routes/index.js — Con DI
 * Los controllers se resuelven UNA SOLA VEZ cuando llega la primera request,
 * y el sub-router resultante se cachea para las siguientes.
 */
const router    = require('express').Router();
const container = require('../../../infrastructure/bootstrap');

// Cache de sub-routers ya inicializados
const routerCache = {};

function lazyRoute(name, factory, name2) {
  return (req, res, next) => {
    if (!routerCache[name]) {
      try {
        const controller = container.get(name);
        const controller2 = name2 ? container.get(name2) : undefined;
        if (!controller) throw new Error(`Controller "${name}" devolvió undefined`);
        routerCache[name] = controller2 ? factory(controller, controller2) : factory(controller);
        console.log(`[DI] ✓ ${name} inicializado`);
      } catch (err) {
        console.error(`[DI] ✗ Error inicializando ${name}:`, err.message);
        console.error(err.stack);
        return res.status(500).json({ error: `Error interno: ${err.message}` });
      }
    }
    routerCache[name](req, res, next);
  };
}

// ─── Rutas migradas a DI ──────────────────────────────────────────────────────
router.use('/auth',     lazyRoute('authController',     require('./auth.routes')));
router.use('/familias', lazyRoute('familiaController',  require('./familia.routes')));
router.use('/usuarios', lazyRoute('usuarioController',  require('./usuario.routes'), 'familiaController'));

// ─── Rutas no migradas ────────────────────────────────────────────────────────
router.use('/miembros',          require('./miembro.routes'));
router.use('/solicitudes',       require('./solicitud.routes'));
router.use('/publicaciones',     require('./publicacion.routes'));
router.use('/fotos',             require('./foto.routes'));
router.use('/mensajes',          require('./mensaje.routes'));
router.use('/chat',              require('./chat.routes'));
router.use('/agenda',            require('./agenda.routes'));
router.use('/estados',           require('./estado.routes'));
router.use('/provisiones',       require('./provision.routes'));
router.use('/detalle-provision', require('./det-provision.routes'));
router.use('/roles',             require('./rol.routes'));
router.use('/search',            require('./search.routes'));

module.exports = router;
