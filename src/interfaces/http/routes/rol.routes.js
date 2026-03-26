const router = require('express').Router();
const C      = require('../controllers/rol.controller');

router.get('/',       C.list);
router.post('/',      C.create);
router.post('/bulk',  C.bulk);

module.exports = router;
