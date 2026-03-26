const router   = require('express').Router();
const C        = require('../controllers/foto.controller');
const validate = require('../middleware/validate.middleware');
const auth     = require('../middleware/auth.guard');
const allow    = require('../middleware/role.guard');
const { addFotoSchema } = require('../../validators');

const ROLES_FOTOS = ['Admin', 'PapaEDI', 'MamaEDI'];

router.post('/',                     auth, allow(...ROLES_FOTOS), validate(addFotoSchema), C.add);
router.get('/post/:id_post',         C.listByPost);
router.get('/familia/:id_familia',   C.listByFamilia);

module.exports = router;
