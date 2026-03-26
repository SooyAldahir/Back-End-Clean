const auth  = require('../middleware/auth.guard');
const allow = require('../middleware/role.guard');

module.exports = (controller) => {
  const router = require('express').Router();

  // Rutas sin auth (búsquedas públicas)
  router.get('/search',                               controller.searchByName);
  router.get('/available',                            controller.listAvailable);
  router.get('/por-ident/:ident',                     controller.byIdent);

  // Rutas con auth
  router.get('/reporte-completo', auth, allow('Admin'), controller.reporteCompleto);
  router.get('/',                                     controller.list);
  router.get('/:id',                                  controller.get);

  router.post('/',   auth, allow('Admin'),            controller.create);
  router.put('/:id', auth, allow('Admin'),            controller.update);
  router.delete('/:id', auth, allow('Admin'),         controller.remove);

  router.patch('/:id/fotos',       auth, allow('Admin','PapaEDI','MamaEDI'), controller.uploadFotos);
  router.patch('/:id/descripcion', auth, allow('Admin','PapaEDI','MamaEDI'), controller.updateDescripcion);

  return router;
};
