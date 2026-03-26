const { sql, queryP, getConnection } = require('../../../infrastructure/database/db');
const { sendPushNotification } = require('../../../infrastructure/notifications/firebase.provider');
const { SOLICITUD_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { USUARIO_QUERIES: UQ } = require('../../../domain/repositories/queries/usuario.queries');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/app.error');

async function createSolicitud({ id_familia, id_usuario, tipo_solicitud }) {
  if (!id_familia || !id_usuario || !tipo_solicitud) {
    throw new BadRequestError('Campos requeridos: id_familia, id_usuario, tipo_solicitud');
  }

  const rows = await queryP(Q.create, {
    id_familia:     { type: sql.Int,      value: id_familia },
    id_usuario:     { type: sql.Int,      value: id_usuario },
    tipo_solicitud: { type: sql.NVarChar, value: tipo_solicitud },
  });
  const nuevaSolicitud = rows[0];

  if (nuevaSolicitud) {
    setImmediate(async () => {
      try {
        const pool  = await getConnection();
        const padresResult = await pool.request()
          .input('id_familia', sql.Int, id_familia)
          .query(UQ.getTokensPadresPorFamilia);

        for (const padre of padresResult.recordset) {
          await pool.request()
            .input('id_usuario_destino', sql.Int,      padre.id_usuario)
            .input('titulo',             sql.NVarChar, 'Nueva Solicitud')
            .input('cuerpo',             sql.NVarChar, 'Un miembro de tu familia solicita aprobación.')
            .input('tipo',               sql.NVarChar, 'SOLICITUD')
            .input('id_referencia',      sql.Int,      nuevaSolicitud.id_solicitud)
            .query(UQ.createNotificacion);

          if (padre.session_token) {
            await sendPushNotification(
              padre.session_token,
              'Nueva Solicitud Familiar 📩',
              'Tu hijo ha enviado una solicitud pendiente de aprobación.',
              { tipo: 'SOLICITUD', id_solicitud: nuevaSolicitud.id_solicitud?.toString() ?? '0' },
            );
          }
        }
      } catch (e) {
        console.error('Error notificaciones solicitud:', e);
      }
    });
  }

  return nuevaSolicitud;
}

async function listByFamilia(id_familia) {
  return queryP(Q.listByFamilia, { id_familia: { type: sql.Int, value: Number(id_familia) } });
}

async function setEstadoSolicitud(id, estado) {
  if (!['Pendiente', 'Aceptada', 'Rechazada'].includes(estado)) {
    throw new BadRequestError('estado inválido');
  }
  const rows = await queryP(Q.setEstado, {
    estado:       { type: sql.NVarChar, value: estado },
    id_solicitud: { type: sql.Int,      value: Number(id) },
  });
  if (!rows.length) throw new NotFoundError();
  return rows[0];
}

module.exports = { createSolicitud, listByFamilia, setEstadoSolicitud };
