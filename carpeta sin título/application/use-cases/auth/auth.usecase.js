const { sql, queryP } = require('../../../infrastructure/database/db');
const { comparePassword, hashPassword } = require('../../../shared/utils/hash');
const { newSessionToken } = require('../../../shared/utils/token');
const { USUARIO_QUERIES: Q } = require('../../../domain/repositories/queries/usuario.queries');
const { BadRequestError } = require('../../../shared/errors/app.error');

async function login({ login, password }) {
  const rows = await queryP(Q.byLogin, { Login: { type: sql.NVarChar, value: login } });
  if (!rows.length) throw new BadRequestError('Usuario no encontrado');

  const user = rows[0];
  const valid = await comparePassword(password, user.contrasena);
  if (!valid) throw new BadRequestError('Contraseña incorrecta');

  const token = newSessionToken();
  await queryP(Q.updateSession, {
    token:      { type: sql.NVarChar, value: token },
    id_usuario: { type: sql.Int,      value: user.id_usuario },
  });

  delete user.contrasena;
  user.session_token = token;
  return user;
}

async function logout(token) {
  if (!token) throw new BadRequestError('Token requerido');
  await queryP(Q.clearToken, { token: { type: sql.NVarChar, value: token } });
}

async function resetPassword({ correo, nuevaContrasena }) {
  if (!correo || !nuevaContrasena) throw new BadRequestError('Faltan datos obligatorios');

  const check = await queryP(
    `SELECT id_usuario FROM EDI.Usuarios WHERE correo = @correo`,
    { correo: { type: sql.NVarChar, value: correo } },
  );
  if (!check.length) throw new BadRequestError('No existe un usuario con ese correo');

  const hashed = await hashPassword(nuevaContrasena);
  await queryP(
    `UPDATE EDI.Usuarios SET contrasena = @pass, updated_at = GETDATE() WHERE correo = @correo`,
    {
      pass:   { type: sql.NVarChar, value: hashed },
      correo: { type: sql.NVarChar, value: correo },
    },
  );
}

module.exports = { login, logout, resetPassword };
