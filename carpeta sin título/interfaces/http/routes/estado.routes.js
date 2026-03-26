const router   = require('express').Router();
const C        = require('../controllers/estado.controller');
const validate = require('../middleware/validate.middleware');
const { createEstadoSchema } = require('../../validators');

router.get('/catalogo',              C.getCatalog);
router.post('/',    validate(createEstadoSchema), C.create);
router.get('/usuario/:id_usuario',   C.listByUsuario);
router.put('/:id/cerrar',            C.close);

module.exports = router;
