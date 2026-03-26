const { comparePassword, hashPassword } = require('../../../shared/utils/hash');
const { newSessionToken }               = require('../../../shared/utils/token');
const { BadRequestError }               = require('../../../shared/errors/app.error');

class AuthUseCase {
  constructor(db, queries) {
    this.sql    = db.sql;
    this.queryP = db.queryP;
    this.Q      = queries.USUARIO_QUERIES;
  }

  async login({ login, password }) {
    const rows = await this.queryP(this.Q.byLogin, {
      Login: { type: this.sql.NVarChar, value: login },
    });
    if (!rows.length) throw new BadRequestError('Usuario no encontrado');

    const user  = rows[0];
    const valid = await comparePassword(password, user.contrasena);
    if (!valid) throw new BadRequestError('Contraseña incorrecta');

    const token = newSessionToken();
    await this.queryP(this.Q.updateSession, {
      token:      { type: this.sql.NVarChar, value: token },
      id_usuario: { type: this.sql.Int,      value: user.id_usuario },
    });

    delete user.contrasena;
    user.session_token = token;
    return user;
  }

  async logout(token) {
    if (!token) throw new BadRequestError('Token requerido');
    await this.queryP(this.Q.clearToken, {
      token: { type: this.sql.NVarChar, value: token },
    });
  }

  async resetPassword({ correo, nuevaContrasena }) {
    if (!correo || !nuevaContrasena) throw new BadRequestError('Faltan datos obligatorios');
    const check = await this.queryP(
      `SELECT id_usuario FROM EDI.Usuarios WHERE correo = @correo`,
      { correo: { type: this.sql.NVarChar, value: correo } },
    );
    if (!check.length) throw new BadRequestError('No existe un usuario con ese correo');
    const hashed = await hashPassword(nuevaContrasena);
    await this.queryP(
      `UPDATE EDI.Usuarios SET contrasena = @pass, updated_at = GETDATE() WHERE correo = @correo`,
      {
        pass:   { type: this.sql.NVarChar, value: hashed },
        correo: { type: this.sql.NVarChar, value: correo },
      },
    );
  }
}

module.exports = AuthUseCase;
