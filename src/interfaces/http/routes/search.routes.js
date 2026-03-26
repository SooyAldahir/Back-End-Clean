const router = require('express').Router();
const C      = require('../controllers/search.controller');

router.get('/', C.search);

module.exports = router;
