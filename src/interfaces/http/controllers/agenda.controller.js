const UC = require('../../../application/use-cases/agenda/agenda.usecase');
const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

exports.create = async (req, res) => {
  try {
    const actividad = await UC.createActividad(req.body, req.files?.imagen);
    created(res, actividad);
    req.io?.to('institucional').emit('evento_creado', actividad);
    req.io?.emit('feed_actualizado', { source: 'agenda', id_actividad: actividad.id_actividad });
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.update = async (req, res) => {
  try {
    const actividad = await UC.updateActividad(Number(req.params.id), req.body, req.files?.imagen);
    ok(res, actividad);
    req.io?.to('institucional').emit('evento_actualizado', actividad);
    req.io?.emit('feed_actualizado', { source: 'agenda', id_actividad: actividad.id_actividad });
  } catch (e) {
    e.statusCode === 404 ? notFound(res, e.message) : fail(res, e);
  }
};

exports.list = async (req, res) => {
  try {
    ok(res, await UC.listActividades(req.query));
  } catch (e) { fail(res, e); }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await UC.removeActividad(id);
    ok(res, { message: 'Evento eliminado' });
    req.io?.to('institucional').emit('evento_eliminado', { id_actividad: id });
    req.io?.emit('feed_actualizado', { source: 'agenda', id_actividad: id });
  } catch (e) { fail(res, e); }
};
