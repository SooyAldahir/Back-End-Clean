const UC = require('../../../application/use-cases/fotos/foto.usecase');
const { ok, created, bad, fail } = require('../../../shared/utils/http.response');

exports.add = async (req, res) => {
  try { created(res, await UC.addFoto(req.body, req.io)); }
  catch (e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
};

exports.listByPost = async (req, res) => {
  try { ok(res, await UC.listByPost(req.params.id_post)); }
  catch (e) { fail(res, e); }
};

exports.listByFamilia = async (req, res) => {
  try { ok(res, await UC.listByFamilia(req.params.id_familia)); }
  catch (e) { fail(res, e); }
};
