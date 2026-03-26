// ─── Mensajes ─────────────────────────────────────────────────────────────────
const { sql, queryP } = require('../../../infrastructure/database/db');
const { sendPushNotification } = require('../../../infrastructure/notifications/firebase.provider');
const { MENSAJE_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError } = require('../../../shared/errors/app.error');

async function createMensaje({ id_familia, mensaje }, id_usuario, nombre_estado) {
  if (nombre_estado === 'Baja Temporal') throw new ForbiddenError('No tienes permiso para escribir mensajes (Baja Temporal).');
  if (!id_familia || !mensaje) throw new BadRequestError('Faltan datos: id_familia o mensaje');

  const result = await queryP(Q.create, {
    id_familia: { type: sql.Int,      value: id_familia },
    id_usuario: { type: sql.Int,      value: id_usuario },
    mensaje:    { type: sql.NVarChar, value: mensaje },
  });

  setImmediate(() => _notificarFamilia(id_familia, id_usuario, mensaje));
  return result[0];
}

async function listMensajesByFamilia(id_familia) {
  return queryP(Q.listByFamilia, { id_familia: { type: sql.Int, value: id_familia } });
}

async function _notificarFamilia(idFamilia, idSender, textoMensaje) {
  try {
    const senderInfo  = await queryP(Q.getSenderName, { id: { type: sql.Int, value: idSender } });
    const nombre      = senderInfo[0]?.nombre || 'Alguien';
    const tokensRows  = await queryP(Q.getFamilyTokens, {
      id_familia: { type: sql.Int, value: idFamilia },
      id_sender:  { type: sql.Int, value: idSender },
    });
    for (const row of tokensRows) {
      if (row.fcm_token) {
        await sendPushNotification(row.fcm_token, `Nuevo mensaje de ${nombre} 💬`, textoMensaje, {
          tipo: 'CHAT', id_familia: idFamilia.toString(), id_referencia: idFamilia.toString(),
        });
      }
    }
  } catch (e) {
    console.error('Error notificando chat familiar:', e);
  }
}

module.exports = { createMensaje, listMensajesByFamilia };
