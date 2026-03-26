const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

class UsuarioController {
  constructor(uc) {
    this.searchUsers = async (req, res) => {
      try { ok(res, await uc.searchUsers({ tipo: req.query.tipo, q: req.query.q })); }
      catch(e) { fail(res, e); }
    };
    this.get = async (req, res) => {
      try { ok(res, await uc.getUsuario(Number(req.params.id))); }
      catch(e) { e.statusCode === 404 ? notFound(res) : fail(res, e); }
    };
    this.create = async (req, res) => {
      try { created(res, await uc.createUsuario(req.body)); }
      catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
    this.update = async (req, res) => {
      try { ok(res, await uc.updateUsuario(Number(req.params.id), req.body || {}, req.files?.foto)); }
      catch(e) { e.statusCode === 404 ? notFound(res) : fail(res, e); }
    };
    this.remove = async (req, res) => {
      try { await uc.removeUsuario(Number(req.params.id)); ok(res, { removed: true }); }
      catch(e) { fail(res, e); }
    };
    this.updateEmail = async (req, res) => {
      try { ok(res, await uc.updateEmail(Number(req.params.id), req.body.correo)); }
      catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
    this.updateToken = async (req, res) => {
      try {
        const { id_usuario, token } = req.body;
        await uc.updateToken(id_usuario, token);
        ok(res, { updated: true });
      } catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
    this.getBirthdays = async (_req, res) => {
      try { ok(res, await uc.getBirthdays()); } catch(e) { fail(res, e); }
    };
  }
}

module.exports = UsuarioController;
