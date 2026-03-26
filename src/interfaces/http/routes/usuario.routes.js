const router   = require('express').Router();
const C        = require('../controllers/usuario.controller');
const FC       = require('../controllers/familia.controller');
const validate = require('../middleware/validate.middleware');
const auth     = require('../middleware/auth.guard');
const { createUserSchema, updateUserSchema } = require('../../validators');

router.get('/',                          C.searchUsers);
router.get('/familias/by-doc/search',    FC.searchByDocument);
router.put('/update-token',              C.updateToken);
router.get('/cumpleanos',                C.getBirthdays);
router.get('/:id',           auth,       C.get);
router.post('/',             validate(createUserSchema), C.create);
router.put('/:id',           validate(updateUserSchema), C.update);
router.delete('/:id',                    C.remove);
router.patch('/:id/email',               C.updateEmail);

module.exports = router;
