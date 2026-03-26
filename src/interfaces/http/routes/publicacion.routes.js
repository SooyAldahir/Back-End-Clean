const router   = require('express').Router();
const C        = require('../controllers/publicacion.controller');
const validate = require('../middleware/validate.middleware');
const auth     = require('../middleware/auth.guard');
const allow    = require('../middleware/role.guard');
const { createPublicacionSchema, setEstadoPublicacionSchema } = require('../../validators');

const ROLES_APP   = ['Admin','PapaEDI','MamaEDI','HijoEDI','HijoSanguineo','Padre','Madre','Tutor','Hijo','ALUMNO','Estudiante'];
const ROLES_ADMIN = ['Admin','PapaEDI','MamaEDI','Padre','Madre','Tutor'];

router.get('/mis-posts',                 auth,                                     C.listByUsuario);
router.get('/feed/global',               auth,                                     C.listGlobal);
router.get('/institucional',             auth, allow(...ROLES_APP),                C.listInstitucional);
router.get('/familia/:id_familia',       auth,                                     C.listByFamilia);
router.get('/familia/:id_familia/pendientes', auth, allow(...ROLES_ADMIN),         C.listPendientes);

router.post('/',                         auth, allow(...ROLES_APP), validate(createPublicacionSchema), C.create);
router.put('/:id/estado',                auth, allow(...ROLES_ADMIN),              C.setEstado);
router.delete('/:id',                    auth,                                     C.remove);

router.post('/:id/like',                 auth,                                     C.toggleLike);
router.get('/:id/comentarios',           auth,                                     C.getComentarios);
router.post('/:id/comentarios',          auth,                                     C.addComentario);
router.delete('/comentarios/:id',        auth,                                     C.deleteComentario);

module.exports = router;
