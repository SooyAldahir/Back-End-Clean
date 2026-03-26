const AuthUseCase = require('../../../application/use-cases/auth/auth.usecase');
const { ok, created, bad, fail } = require('../../../shared/utils/http.response');

exports.login = async (req, res) => {
  try {
    const { login, password } = req.body || {};
    if (!login || !password) return bad(res, 'Faltan datos: login o password');
    const user = await AuthUseCase.login({ login, password });
    ok(res, user);
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    await AuthUseCase.logout(token);
    ok(res, { message: 'Sesión cerrada' });
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await AuthUseCase.resetPassword(req.body);
    ok(res, { message: 'Contraseña actualizada correctamente' });
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};
