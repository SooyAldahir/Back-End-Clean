const router   = require('express').Router();
const C        = require('../controllers/familia.controller');
const validate = require('../middleware/validate.middleware');
const auth     = require('../middleware/auth.guard');
const allow    = require('../middleware/role.guard');
const { createFamiliaSchema, updateFamiliaSchema } = require('../../validators');

router.get('/search',                              C.searchByName);
router.get('/available',                           C.listAvailable);
router.get('/por-ident/:ident',                    C.byIdent);
router.get('/reporte-completo', auth, allow('Admin'), C.reporteCompleto);
router.get('/',                                    C.list);
router.get('/:id',                                 C.get);

router.post('/',   auth, allow('Admin'),           validate(createFamiliaSchema), C.create);
router.put('/:id', auth, allow('Admin'),           validate(updateFamiliaSchema), C.update);
router.delete('/:id', auth, allow('Admin'),        C.remove);

router.patch('/:id/fotos',       auth, allow('Admin', 'PapaEDI', 'MamaEDI'), C.uploadFotos);
router.patch('/:id/descripcion', auth, allow('Admin', 'PapaEDI', 'MamaEDI'), C.updateDescripcion);

module.exports = router;
