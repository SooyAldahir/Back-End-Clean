module.exports = (controller) => {
  const router = require('express').Router();
  router.post('/login',          controller.login);
  router.post('/logout',         controller.logout);
  router.post('/reset-password', controller.resetPassword);
  return router;
};
