const { sql, queryP } = require('../../../infrastructure/database/db');
const { DET_PROVISION_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError } = require('../../../shared/errors/app.error');

async function markAsistencia({ id_provision, id_usuario, asistio }) {
  if (!id_provision || !id_usuario || typeof asistio !== 'number') {
    throw new BadRequestError('id_provision, id_usuario y asistio (0/1) requeridos');
  }
  const rows = await queryP(Q.upsert, {
    id_provision: { type: sql.Int, value: id_provision },
    id_usuario:   { type: sql.Int, value: id_usuario },
    asistio:      { type: sql.Bit, value: asistio ? 1 : 0 },
  });
  return rows[0];
}

async function listByProvision(id_provision) {
  return queryP(Q.listByProvision, { id_provision: { type: sql.Int, value: Number(id_provision) } });
}

module.exports = { markAsistencia, listByProvision };
