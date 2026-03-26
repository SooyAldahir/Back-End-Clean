const UC = require('../../../application/use-cases/usuarios/usuario.usecase');
const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

const _userId = (req) => req.user?.id_usuario ?? req.user?.id;

exports.create = async (req, res) => {
  try {
    const user = await UC.createUsuario(req.body);
    created(res, user);
  } catch (e) {
    if (e.number === 2627 || (e.message || '').includes('UNIQUE KEY')) return bad(res, 'El correo ya está registrado.');
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.update = async (req, res) => {
  try {
    const user = await UC.updateUsuario(req.params.id, req.body, req.files?.foto);
    ok(res, user);
  } catch (e) {
    e.statusCode === 404 ? notFound(res) : e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.list = async (_req, res) => {
  try { ok(res, await UC.listUsuarios()); } catch (e) { fail(res, e); }
};

exports.get = async (req, res) => {
  try {
    ok(res, await UC.getUsuario(req.params.id));
  } catch (e) {
    e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};

exports.remove = async (req, res) => {
  try {
    await UC.removeUsuario(req.params.id);
    ok(res, { message: 'Usuario desactivado' });
  } catch (e) { fail(res, e); }
};

exports.updateEmail = async (req, res) => {
  try {
    ok(res, await UC.updateEmail(Number(req.params.id), req.body.correo));
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : e.statusCode === 404 ? notFound(res) : fail(res, e);
  }
};

exports.updateToken = async (req, res) => {
  try {
    const { id_usuario, fcm_token, token, session_token } = req.body;
    await UC.updateToken(id_usuario, fcm_token || token || session_token);
    ok(res, { msg: 'Token actualizado correctamente' });
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.searchUsers = async (req, res) => {
  try {
    res.json(await UC.searchUsers({ tipo: req.query.tipo, q: req.query.q }));
  } catch (e) { res.status(500).json([]); }
};

exports.getBirthdays = async (_req, res) => {
  try { ok(res, await UC.getBirthdays()); } catch (e) { fail(res, e); }
};
