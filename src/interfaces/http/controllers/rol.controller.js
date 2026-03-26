const UC = require('../../../application/use-cases/roles/rol.usecase');
const { ok, created, bad, fail } = require('../../../shared/utils/http.response');

exports.list = async (_req, res) => {
  try { ok(res, await UC.listRoles()); } catch (e) { fail(res, e); }
};

exports.create = async (req, res) => {
  try { created(res, await UC.createRol(req.body)); }
  catch (e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
};

exports.bulk = async (req, res) => {
  try { ok(res, await UC.bulkRoles(req.body.roles)); }
  catch (e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
};
