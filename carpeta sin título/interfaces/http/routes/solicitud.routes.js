const router   = require('express').Router();
const C        = require('../controllers/solicitud.controller');
const validate = require('../middleware/validate.middleware');
const { createSolicitudSchema, setEstadoSolicitudSchema } = require('../../validators');

router.post('/',                     validate(createSolicitudSchema),    C.create);
router.put('/:id/estado',            validate(setEstadoSolicitudSchema), C.setEstado);
router.get('/familia/:id_familia',   C.listByFamilia);

module.exports = router;
