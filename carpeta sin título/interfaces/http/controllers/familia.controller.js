const UC = require('../../../application/use-cases/familias/familia.usecase');
const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

exports.list = async (_req, res) => {
  try { ok(res, await UC.listFamilias()); } catch (e) { fail(res, e); }
};

exports.get = async (req, res) => {
  try {
    ok(res, await UC.getFamilia(Number(req.params.id)));
  } catch (e) {
    e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};

exports.create = async (req, res) => {
  try {
    const familia = await UC.createFamilia(req.body);
    req.io?.to('institucional').emit('familia_creada', familia);
    created(res, familia);
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.update = async (req, res) => {
  try {
    ok(res, await UC.updateFamilia(Number(req.params.id), req.body));
  } catch (e) {
    e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};

exports.remove = async (req, res) => {
  try {
    await UC.removeFamilia(Number(req.params.id));
    ok(res, { message: 'Familia desactivada' });
  } catch (e) { fail(res, e); }
};

exports.uploadFotos = async (req, res) => {
  try {
    ok(res, await UC.uploadFamiliaFotos(Number(req.params.id), req.files));
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};

exports.updateDescripcion = async (req, res) => {
  try {
    ok(res, await UC.updateDescripcion(Number(req.params.id), req.body.descripcion));
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};

exports.searchByName = async (req, res) => {
  try { res.json(await UC.searchByName((req.query.name || '').trim())); }
  catch (e) { res.status(500).json([]); }
};

exports.searchByDocument = async (req, res) => {
  try {
    res.json(await UC.searchByDocument({ matricula: req.query.matricula, numEmpleado: req.query.numEmpleado }));
  } catch (e) { res.status(500).json([]); }
};

exports.byIdent = async (req, res) => {
  try {
    ok(res, await UC.searchByIdent(req.params.ident));
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.reporteCompleto = async (_req, res) => {
  try { ok(res, await UC.reporteCompleto()); } catch (e) { fail(res, e); }
};

exports.listAvailable = async (_req, res) => {
  try { ok(res, await UC.listAvailable()); } catch (e) { fail(res, e); }
};
