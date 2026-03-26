const UC = require('../../../application/use-cases/solicitudes/solicitud.usecase');
const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

exports.create = async (req, res) => {
  try {
    const solicitud = await UC.createSolicitud(req.body);
    req.io?.to(`familia_${req.body.id_familia}`).emit('solicitud_creada', solicitud);
    created(res, solicitud);
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.listByFamilia = async (req, res) => {
  try { ok(res, await UC.listByFamilia(req.params.id_familia)); }
  catch (e) { fail(res, e); }
};

exports.setEstado = async (req, res) => {
  try {
    const updated = await UC.setEstadoSolicitud(req.params.id, req.body.estado);
    req.io?.to(`familia_${updated.id_familia}`).emit('solicitud_estado_actualizado', updated);
    ok(res, updated);
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};
