const router = require('express').Router();
const C      = require('../controllers/chat.controller');
const auth   = require('../middleware/auth.guard');

router.post('/private',             auth, C.initPrivateChat);
router.post('/group',               auth, C.createGroup);
router.post('/message',             auth, C.sendMessage);
router.get('/',                     auth, C.getMyChats);
router.get('/:id_sala/messages',    auth, C.getMessages);

module.exports = router;
