const router   = require('express').Router();
const C        = require('../controllers/miembro.controller');
const validate = require('../middleware/validate.middleware');
const auth     = require('../middleware/auth.guard');
const allow    = require('../middleware/role.guard');
const { addMiembroSchema, addMiembrosBulkSchema } = require('../../validators');

router.post('/',      auth, allow('Admin'), validate(addMiembroSchema),      C.add);
router.post('/bulk',  auth, allow('Admin'), validate(addMiembrosBulkSchema),  C.addBulk);
router.delete('/:id', auth, allow('Admin'),                                   C.remove);
router.get('/familia/:id',                                                     C.byFamilia);

module.exports = router;
