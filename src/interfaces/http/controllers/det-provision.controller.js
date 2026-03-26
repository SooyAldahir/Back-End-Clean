const UC = require('../../../application/use-cases/det-provisiones/det-provision.usecase');
const { ok, created, bad, fail } = require('../../../shared/utils/http.response');

exports.mark = async (req, res) => {
  try { created(res, await UC.markAsistencia(req.body)); }
  catch (e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
};

exports.listByProvision = async (req, res) => {
  try { ok(res, await UC.listByProvision(req.params.id_provision)); }
  catch (e) { fail(res, e); }
};
