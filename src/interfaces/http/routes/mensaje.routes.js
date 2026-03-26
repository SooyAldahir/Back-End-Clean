const router = require('express').Router();
const C      = require('../controllers/mensaje.controller');
const auth   = require('../middleware/auth.guard');

router.post('/',                    auth, C.create);
router.get('/familia/:id_familia',  auth, C.listByFamilia);

module.exports = router;
