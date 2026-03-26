const { sql, queryP } = require('../../../infrastructure/database/db');
const { hashPassword } = require('../../../shared/utils/hash');
const { formatSpanishName } = require('../../../shared/utils/name.formatter');
const { saveOptimizedProfilePhoto } = require('../../../infrastructure/storage/image.storage');
const { USUARIO_QUERIES: Q } = require('../../../domain/repositories/queries/usuario.queries');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/app.error');

async function createUsuario(data) {
  const hashed = await hashPassword(data.contrasena);

  const params = {
    nombre:           { type: sql.NVarChar, value: formatSpanishName(data.nombre) },
    apellido:         { type: sql.NVarChar, value: formatSpanishName(data.apellido) ?? null },
    correo:           { type: sql.NVarChar, value: data.correo },
    contrasena:       { type: sql.NVarChar, value: hashed },
    foto_perfil:      { type: sql.NVarChar, value: data.foto_perfil ?? null },
    tipo_usuario:     { type: sql.NVarChar, value: data.tipo_usuario },
    matricula:        { type: sql.Int,      value: data.matricula ?? null },
    num_empleado:     { type: sql.Int,      value: data.num_empleado ?? null },
    id_rol:           { type: sql.Int,      value: data.id_rol },
    telefono:         { type: sql.NVarChar, value: data.telefono ?? null },
    residencia:       { type: sql.NVarChar, value: data.residencia ?? null },
    direccion:        { type: sql.NVarChar, value: data.direccion ?? null },
    fecha_nacimiento: { type: sql.Date,     value: data.fecha_nacimiento ?? null },
    carrera:          { type: sql.NVarChar, value: data.carrera ?? null },
  };

  const rows = await queryP(Q.insert, params);
  if (!rows || !rows.length) throw new Error('La BD no devolvió el usuario creado');

  const user = rows[0];
  delete user.contrasena;

  // Integrar a comunidad de padres en background
  const userId = user.id_usuario;
  if (userId) {
    setImmediate(() =>
      queryP(Q.integrarComunidadPadres, {
        idRol:     { type: sql.Int, value: data.id_rol },
        idUsuario: { type: sql.Int, value: userId },
      }).catch((e) => console.error('Error al integrar comunidad padres:', e.message)),
    );
  }

  return user;
}

async function updateUsuario(id, data, file) {
  let fotoPerfil = null;
  if (file) {
    fotoPerfil = await saveOptimizedProfilePhoto(file, id);
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

  const params = {
    id_usuario:       { type: sql.Int,      value: Number(id) },
    nombre:           { type: sql.NVarChar, value: nn(data.nombre) },
    apellido:         { type: sql.NVarChar, value: nn(data.apellido) },
    foto_perfil:      { type: sql.NVarChar, value: fotoPerfil ?? nn(data.foto_perfil) },
    estado:           { type: sql.NVarChar, value: nn(data.estado) },
    activo:           { type: sql.Bit,      value: data.activo === undefined ? null : (data.activo ? 1 : 0) },
    telefono:         { type: sql.NVarChar, value: nn(data.telefono) },
    residencia:       { type: sql.NVarChar, value: nn(data.residencia) },
    direccion:        { type: sql.NVarChar, value: nn(data.direccion) },
    fecha_nacimiento: { type: sql.Date,     value: fechaDate },
    carrera:          { type: sql.NVarChar, value: nn(data.carrera) },
  };

  const rows = await queryP(Q.updateBasic, params);
  if (!rows.length) throw new NotFoundError();

  const user = rows[0];
  delete user.contrasena;
  return user;
}

async function listUsuarios() {
  return queryP(Q.list);
}

async function getUsuario(id) {
  const rows = await queryP(Q.byId, { id_usuario: { type: sql.Int, value: Number(id) } });
  if (!rows.length) throw new NotFoundError();
  const user = rows[0];
  delete user.contrasena;
  return user;
}

async function removeUsuario(id) {
  await queryP(Q.softDelete, { id_usuario: { type: sql.Int, value: Number(id) } });
}

async function updateEmail(id, correo) {
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Id inválido');
  if (!correo || !/^\S+@\S+\.\S+$/.test(correo)) throw new BadRequestError('Correo inválido');

  const dup = await queryP(
    `SELECT 1 FROM EDI.Usuarios WHERE correo = @correo AND id_usuario <> @id`,
    { correo: { type: sql.NVarChar, value: correo }, id: { type: sql.Int, value: id } },
  );
  if (dup.length) throw new BadRequestError('El correo ya está en uso');

  const rows = await queryP(
    `UPDATE EDI.Usuarios SET correo = @correo, updated_at = GETDATE()
     OUTPUT INSERTED.id_usuario AS IdUsuario, INSERTED.nombre AS Nombre,
            INSERTED.apellido AS Apellido, INSERTED.correo AS E_mail, INSERTED.estado AS Estado
     WHERE id_usuario = @id`,
    { correo: { type: sql.NVarChar, value: correo }, id: { type: sql.Int, value: id } },
  );
  if (!rows.length) throw new NotFoundError();
  return rows[0];
}

async function updateToken(id_usuario, token) {
  if (!id_usuario || !token) throw new BadRequestError('Faltan datos (id_usuario o token)');
  await queryP(Q.updateFcm, {
    id_usuario: { type: sql.Int,      value: Number(id_usuario) },
    token:      { type: sql.NVarChar, value: token },
  });
}

async function searchUsers({ tipo, q }) {
  tipo = (tipo || '').toUpperCase();
  if (!['ALUMNO', 'EMPLEADO', 'EXTERNO'].includes(tipo)) return [];

  const isNumeric = /^\d+$/.test(q || '');
  const like = `%${(q || '').trim()}%`;

  const base = `
    SELECT u.id_usuario AS IdUsuario, u.nombre AS Nombre, u.apellido AS Apellido,
           u.tipo_usuario AS TipoUsuario, u.matricula AS Matricula,
           u.num_empleado AS NumEmpleado, u.correo AS E_mail, u.foto_perfil AS FotoPerfil
    FROM EDI.Usuarios u WHERE u.tipo_usuario = @tipo
  `;

  let sqlText;
  if (isNumeric && tipo === 'ALUMNO')    sqlText = `${base} AND CAST(u.matricula AS NVARCHAR(50)) LIKE @like ORDER BY u.nombre, u.apellido`;
  else if (isNumeric)                    sqlText = `${base} AND CAST(u.num_empleado AS NVARCHAR(50)) LIKE @like ORDER BY u.nombre, u.apellido`;
  else                                   sqlText = `${base} AND (u.nombre LIKE @like OR u.apellido LIKE @like) ORDER BY u.nombre, u.apellido`;

  return queryP(sqlText, {
    tipo: { type: sql.NVarChar, value: tipo },
    like: { type: sql.NVarChar, value: like },
  });
}

async function getBirthdays() {
  return queryP(Q.birthdaysToday);
}

module.exports = {
  createUsuario, updateUsuario, listUsuarios, getUsuario,
  removeUsuario, updateEmail, updateToken, searchUsers, getBirthdays,
};
