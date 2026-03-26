const router   = require('express').Router();
const C        = require('../controllers/det-provision.controller');
const validate = require('../middleware/validate.middleware');
const { markAsistenciaSchema } = require('../../validators');

router.post('/',                         validate(markAsistenciaSchema), C.mark);
router.get('/provision/:id_provision',   C.listByProvision);

module.exports = router;
