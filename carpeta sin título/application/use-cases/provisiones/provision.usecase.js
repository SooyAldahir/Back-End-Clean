const { sql, queryP } = require('../../../infrastructure/database/db');
const { PROVISION_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError } = require('../../../shared/errors/app.error');

async function createProvision({ id_familia, fecha, cantidad_cenas, comentario }) {
  if (!id_familia || !fecha || !cantidad_cenas) throw new BadRequestError('id_familia, fecha y cantidad_cenas requeridos');
  const rows = await queryP(Q.create, {
    id_familia:     { type: sql.Int,      value: id_familia },
    fecha:          { type: sql.Date,     value: fecha },
    cantidad_cenas: { type: sql.Int,      value: cantidad_cenas },
    comentario:     { type: sql.NVarChar, value: comentario ?? null },
  });
  return rows[0];
}

async function listByFamilia(id_familia, { desde, hasta } = {}) {
  return queryP(Q.listByFamilia, {
    id_familia: { type: sql.Int,  value: Number(id_familia) },
    desde:      { type: sql.Date, value: desde ?? null },
    hasta:      { type: sql.Date, value: hasta ?? null },
  });
}

module.exports = { createProvision, listByFamilia };
