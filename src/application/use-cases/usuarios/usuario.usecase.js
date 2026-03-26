const { hashPassword }                    = require('../../../shared/utils/hash');
const { formatSpanishName }               = require('../../../shared/utils/name.formatter');
const { BadRequestError, NotFoundError }  = require('../../../shared/errors/app.error');

class UsuarioUseCase {
  constructor(db, queries, imageStorage) {
    this.sql           = db.sql;
    this.queryP        = db.queryP;
    this.Q             = queries.USUARIO_QUERIES;
    this.imageStorage  = imageStorage;
  }

  async listUsuarios() {
    return this.queryP(this.Q.list);
  }

  async getUsuario(id) {
    const rows = await this.queryP(this.Q.byId, { id_usuario: { type: this.sql.Int, value: Number(id) } });
    if (!rows.length) throw new NotFoundError();
    const user = rows[0]; delete user.contrasena; return user;
  }

  async createUsuario(data) {
    const hashed = await hashPassword(data.contrasena);
    const rows = await this.queryP(this.Q.insert, {
      nombre:           { type: this.sql.NVarChar, value: formatSpanishName(data.nombre) },
      apellido:         { type: this.sql.NVarChar, value: formatSpanishName(data.apellido) ?? null },
      correo:           { type: this.sql.NVarChar, value: data.correo },
      contrasena:       { type: this.sql.NVarChar, value: hashed },
      foto_perfil:      { type: this.sql.NVarChar, value: data.foto_perfil ?? null },
      tipo_usuario:     { type: this.sql.NVarChar, value: data.tipo_usuario },
      matricula:        { type: this.sql.Int,      value: data.matricula ?? null },
      num_empleado:     { type: this.sql.Int,      value: data.num_empleado ?? null },
      id_rol:           { type: this.sql.Int,      value: data.id_rol },
      telefono:         { type: this.sql.NVarChar, value: data.telefono ?? null },
      residencia:       { type: this.sql.NVarChar, value: data.residencia ?? null },
      direccion:        { type: this.sql.NVarChar, value: data.direccion ?? null },
      fecha_nacimiento: { type: this.sql.Date,     value: data.fecha_nacimiento ?? null },
      carrera:          { type: this.sql.NVarChar, value: data.carrera ?? null },
    });
    if (!rows?.length) throw new Error('La BD no devolvió el usuario creado');
    const user = rows[0]; delete user.contrasena;
    const userId = user.id_usuario;
    if (userId) {
      setImmediate(() =>
        this.queryP(this.Q.integrarComunidadPadres, {
          idRol:     { type: this.sql.Int, value: data.id_rol },
          idUsuario: { type: this.sql.Int, value: userId },
        }).catch((e) => console.error('Error al integrar comunidad padres:', e.message)),
      );
    }
    return user;
  }

  async updateUsuario(id, data, file) {
    data = data || {}; // guard against undefined body
    let fotoPerfil = null;
    if (file) {
      fotoPerfil = await this.imageStorage.saveOptimizedProfilePhoto(file, id);
    }

    const nn = (v) =>
      v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? null : v;

    let fechaDate = null;
    if (data.fecha_nacimiento) {
      let iso = String(data.fecha_nacimiento).trim();
      const m = iso.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) iso = `${m[3]}-${m[2]}-${m[1]}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) fechaDate = d;
    }

    const rows = await this.queryP(this.Q.updateBasic, {
      id_usuario:       { type: this.sql.Int,      value: Number(id) },
      nombre:           { type: this.sql.NVarChar, value: nn(data.nombre) },
      apellido:         { type: this.sql.NVarChar, value: nn(data.apellido) },
      foto_perfil:      { type: this.sql.NVarChar, value: fotoPerfil ?? nn(data.foto_perfil) },
      estado:           { type: this.sql.NVarChar, value: nn(data.estado) },
      activo:           { type: this.sql.Bit,      value: data.activo === undefined ? null : (data.activo ? 1 : 0) },
      telefono:         { type: this.sql.NVarChar, value: nn(data.telefono) },
      residencia:       { type: this.sql.NVarChar, value: nn(data.residencia) },
      direccion:        { type: this.sql.NVarChar, value: nn(data.direccion) },
      fecha_nacimiento: { type: this.sql.Date,     value: fechaDate },
      carrera:          { type: this.sql.NVarChar, value: nn(data.carrera) },
    });
    if (!rows.length) throw new NotFoundError();
    const user = rows[0]; delete user.contrasena; return user;
  }

  async removeUsuario(id) {
    await this.queryP(this.Q.softDelete, { id_usuario: { type: this.sql.Int, value: Number(id) } });
  }

  async updateEmail(id, correo) {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Id inválido');
    if (!correo || !/^\S+@\S+\.\S+$/.test(correo)) throw new BadRequestError('Correo inválido');
    const dup = await this.queryP(
      `SELECT 1 FROM EDI.Usuarios WHERE correo = @correo AND id_usuario <> @id`,
      { correo: { type: this.sql.NVarChar, value: correo }, id: { type: this.sql.Int, value: id } },
    );
    if (dup.length) throw new BadRequestError('El correo ya está en uso');
    const rows = await this.queryP(
      `UPDATE EDI.Usuarios SET correo = @correo, updated_at = GETDATE()
       OUTPUT INSERTED.id_usuario AS IdUsuario, INSERTED.nombre, INSERTED.apellido,
              INSERTED.correo AS E_mail, INSERTED.estado
       WHERE id_usuario = @id`,
      { correo: { type: this.sql.NVarChar, value: correo }, id: { type: this.sql.Int, value: id } },
    );
    if (!rows.length) throw new NotFoundError();
    return rows[0];
  }

  async updateToken(id_usuario, token) {
    if (!id_usuario || !token) throw new BadRequestError('Faltan datos (id_usuario o token)');
    await this.queryP(this.Q.updateFcm, {
      id_usuario: { type: this.sql.Int,      value: Number(id_usuario) },
      token:      { type: this.sql.NVarChar, value: token },
    });
  }

  async searchUsers({ tipo, q }) {
    tipo = (tipo || '').toUpperCase();
    if (!['ALUMNO', 'EMPLEADO', 'EXTERNO'].includes(tipo)) return [];
    const isNumeric = /^\d+$/.test(q || '');
    const like      = `%${(q || '').trim()}%`;
    const base      = `
      SELECT u.id_usuario AS IdUsuario, u.nombre AS Nombre, u.apellido AS Apellido,
             u.tipo_usuario AS TipoUsuario, u.matricula AS Matricula,
             u.num_empleado AS NumEmpleado, u.correo AS E_mail, u.foto_perfil AS FotoPerfil
      FROM EDI.Usuarios u WHERE u.tipo_usuario = @tipo
    `;
    let sqlText;
    if (isNumeric && tipo === 'ALUMNO')  sqlText = `${base} AND CAST(u.matricula AS NVARCHAR(50)) LIKE @like ORDER BY u.nombre, u.apellido`;
    else if (isNumeric)                  sqlText = `${base} AND CAST(u.num_empleado AS NVARCHAR(50)) LIKE @like ORDER BY u.nombre, u.apellido`;
    else                                 sqlText = `${base} AND (u.nombre LIKE @like OR u.apellido LIKE @like) ORDER BY u.nombre, u.apellido`;
    return this.queryP(sqlText, {
      tipo: { type: this.sql.NVarChar, value: tipo },
      like: { type: this.sql.NVarChar, value: like },
    });
  }

  async getBirthdays() {
    return this.queryP(this.Q.birthdaysToday);
  }
}

module.exports = UsuarioUseCase;
