const { ok, bad, fail } = require('../../../shared/utils/http.response');

class AuthController {
  constructor(uc) {
    this.login = async (req, res) => {
      try {
        const { login, password } = req.body || {};
        if (!login || !password) return bad(res, 'Faltan datos: login o password');
        ok(res, await uc.login({ login, password }));
      } catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
    this.logout = async (req, res) => {
      try {
        const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
        await uc.logout(token);
        ok(res, { message: 'Sesión cerrada' });
      } catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
    this.resetPassword = async (req, res) => {
      try {
        await uc.resetPassword(req.body);
        ok(res, { message: 'Contraseña actualizada correctamente' });
      } catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
  }
}

module.exports = AuthController;
