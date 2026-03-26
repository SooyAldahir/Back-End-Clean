const router   = require('express').Router();
const C        = require('../controllers/provision.controller');
const validate = require('../middleware/validate.middleware');
const { createProvisionSchema } = require('../../validators');

router.post('/',                     validate(createProvisionSchema), C.create);
router.get('/familia/:id_familia',   C.listByFamilia);

module.exports = router;
