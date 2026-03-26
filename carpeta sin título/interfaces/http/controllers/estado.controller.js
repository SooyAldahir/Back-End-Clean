const EstadoUC     = require('../../../application/use-cases/estados/estado.usecase');
const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

exports.getCatalog = async (_req, res) => {
  try { ok(res, await EstadoUC.getCatalog()); } catch (e) { fail(res, e); }
};

exports.create = async (req, res) => {
  try {
    created(res, await EstadoUC.createEstado(req.body));
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.listByUsuario = async (req, res) => {
  try { ok(res, await EstadoUC.listByUsuario(req.params.id_usuario)); } catch (e) { fail(res, e); }
};

exports.close = async (req, res) => {
  try {
    ok(res, await EstadoUC.closeEstado(req.params.id));
  } catch (e) {
    e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};
