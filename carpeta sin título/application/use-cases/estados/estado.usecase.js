const { sql, queryP } = require('../../../infrastructure/database/db');
const { ESTADO_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/app.error');

async function getCatalog() {
  return queryP(Q.getCatalog);
}

async function createEstado({ id_usuario, id_cat_estado, fecha_inicio, fecha_fin, unico_vigente = true }) {
  if (!id_usuario || !id_cat_estado) throw new BadRequestError('id_usuario e id_cat_estado requeridos');

  const catalogo      = await queryP(Q.getCatalogById, { id: { type: sql.Int, value: id_cat_estado } });
  const nombreEstado  = catalogo[0]?.descripcion || 'Desconocido';

  if (unico_vigente) {
    await queryP(Q.closePrevActives, { id_usuario: { type: sql.Int, value: id_usuario } });
  }

  const rows = await queryP(Q.create, {
    id_usuario:    { type: sql.Int,      value: id_usuario },
    id_cat_estado: { type: sql.Int,      value: id_cat_estado },
    tipo_estado:   { type: sql.NVarChar, value: nombreEstado },
    fecha_inicio:  { type: sql.DateTime, value: fecha_inicio ?? null },
    fecha_fin:     { type: sql.DateTime, value: fecha_fin ?? null },
    activo:        { type: sql.Bit,      value: 1 },
  });

  await queryP(Q.updateUserStatus, {
    id_usuario: { type: sql.Int,      value: id_usuario },
    estado:     { type: sql.NVarChar, value: nombreEstado },
  });

  return rows[0];
}

async function listByUsuario(id_usuario) {
  return queryP(Q.listByUsuario, { id_usuario: { type: sql.Int, value: Number(id_usuario) } });
}

async function closeEstado(id) {
  const rows = await queryP(Q.close, { id_estado: { type: sql.Int, value: Number(id) } });
  if (!rows.length) throw new NotFoundError();
  return rows[0];
}

module.exports = { getCatalog, createEstado, listByUsuario, closeEstado };
