const UC = require('../../../application/use-cases/provisiones/provision.usecase');
const { ok, created, bad, fail } = require('../../../shared/utils/http.response');

exports.create = async (req, res) => {
  try { created(res, await UC.createProvision(req.body)); }
  catch (e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
};

exports.listByFamilia = async (req, res) => {
  try { ok(res, await UC.listByFamilia(req.params.id_familia, req.query)); }
  catch (e) { fail(res, e); }
};
