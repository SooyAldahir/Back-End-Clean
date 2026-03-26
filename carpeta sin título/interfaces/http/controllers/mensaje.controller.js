// ─── mensajes.controller.js ───────────────────────────────────────────────────
const MensajeUC = require('../../../application/use-cases/mensajes/mensaje.usecase');
const { ok, created, bad, fail } = require('../../../shared/utils/http.response');

const _userId = (req) => req.user?.id_usuario ?? req.user?.id ?? req.user?.userId;

exports.create = async (req, res) => {
  try {
    const id_usuario    = _userId(req);
    const nombre_estado = req.user?.estado;
    const nuevoMensaje  = await MensajeUC.createMensaje(req.body, id_usuario, nombre_estado);

    const io = req.app.get('socketio');
    if (io) io.to(`familia_${req.body.id_familia}`).emit('nuevo_mensaje_familia', nuevoMensaje);

    created(res, nuevoMensaje);
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) :
    e.statusCode === 403 ? res.status(403).json({ error: e.message }) :
    fail(res, e);
  }
};

exports.listByFamilia = async (req, res) => {
  try {
    ok(res, await MensajeUC.listMensajesByFamilia(req.params.id_familia));
  } catch (e) { fail(res, e); }
};
