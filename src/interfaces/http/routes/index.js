const router = require('express').Router();

router.use('/auth',             require('./auth.routes'));
router.use('/usuarios',         require('./usuario.routes'));
router.use('/familias',         require('./familia.routes'));
router.use('/miembros',         require('./miembro.routes'));
router.use('/solicitudes',      require('./solicitud.routes'));
router.use('/publicaciones',    require('./publicacion.routes'));
router.use('/fotos',            require('./foto.routes'));
router.use('/mensajes',         require('./mensaje.routes'));
router.use('/chat',             require('./chat.routes'));
router.use('/agenda',           require('./agenda.routes'));
router.use('/estados',          require('./estado.routes'));
router.use('/provisiones',      require('./provision.routes'));
router.use('/detalle-provision',require('./det-provision.routes'));
router.use('/roles',            require('./rol.routes'));
router.use('/search',           require('./search.routes'));

module.exports = router;
