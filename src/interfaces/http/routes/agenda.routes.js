const router = require('express').Router();
const C      = require('../controllers/agenda.controller');
const auth   = require('../middleware/auth.guard');
const allow  = require('../middleware/role.guard');

const ADMIN = ['Admin'];

router.get('/',       auth,                  C.list);
router.post('/',      auth, allow(...ADMIN), C.create);
router.put('/:id',    auth, allow(...ADMIN), C.update);
router.delete('/:id', auth, allow(...ADMIN), C.remove);

module.exports = router;
