const auth     = require('../middleware/auth.guard');
const validate = require('../middleware/validate.middleware');

module.exports = (controller, familiaController) => {
  const router = require('express').Router();
  const { createUserSchema, updateUserSchema } = require('../../validators');

  router.get('/',                        controller.searchUsers);
  router.get('/familias/by-doc/search',  familiaController.searchByDocument);
  router.put('/update-token',            controller.updateToken);
  router.get('/cumpleanos',              controller.getBirthdays);
  router.get('/:id',           auth,     controller.get);
  router.post('/',             validate(createUserSchema), controller.create);
  router.put('/:id',           validate(updateUserSchema), controller.update);
  router.delete('/:id',                  controller.remove);
  router.patch('/:id/email',             controller.updateEmail);

  return router;
};
