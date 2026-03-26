const { sql, queryP } = require('../../../infrastructure/database/db');
const { sendMulticastNotification } = require('../../../infrastructure/notifications/firebase.provider');
const { CHAT_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError } = require('../../../shared/errors/app.error');

async function initPrivateChat(myId, targetUserId) {
  if (!targetUserId) throw new BadRequestError('Falta el ID del usuario destino');

  const existing = await queryP(Q.findPrivateChat, {
    my_id:    { type: sql.Int, value: myId },
    other_id: { type: sql.Int, value: targetUserId },
  });
  if (existing.length) return { id_sala: existing[0].id_sala, created: false };

  const sala   = await queryP(Q.createSala, { nombre: { type: sql.NVarChar, value: null }, tipo: { type: sql.NVarChar, value: 'PRIVADO' } });
  const idSala = sala[0].id_sala;

  await queryP(Q.addParticipante, { id_sala: { type: sql.Int, value: idSala }, id_usuario: { type: sql.Int, value: myId },         es_admin: { type: sql.Bit, value: 1 } });
  await queryP(Q.addParticipante, { id_sala: { type: sql.Int, value: idSala }, id_usuario: { type: sql.Int, value: targetUserId }, es_admin: { type: sql.Bit, value: 0 } });

  return { id_sala: idSala, created: true };
}

async function createGroup(myId, { nombre_grupo, ids_usuarios }) {
  if (!nombre_grupo || !ids_usuarios) throw new BadRequestError('Datos incompletos');

  const sala   = await queryP(Q.createSala, { nombre: { type: sql.NVarChar, value: nombre_grupo }, tipo: { type: sql.NVarChar, value: 'GRUPAL' } });
  const idSala = sala[0].id_sala;

  await queryP(Q.addParticipante, { id_sala: { type: sql.Int, value: idSala }, id_usuario: { type: sql.Int, value: myId }, es_admin: { type: sql.Bit, value: 1 } });
  for (const userId of ids_usuarios) {
    await queryP(Q.addParticipante, { id_sala: { type: sql.Int, value: idSala }, id_usuario: { type: sql.Int, value: userId }, es_admin: { type: sql.Bit, value: 0 } });
  }

  return { id_sala: idSala, message: 'Grupo creado' };
}

async function sendMessage({ id_sala, mensaje }, myId, myName) {
  const rows = await queryP(Q.sendMessage, {
    id_sala:      { type: sql.Int,      value: id_sala },
    id_usuario:   { type: sql.Int,      value: myId },
    mensaje:      { type: sql.NVarChar, value: mensaje },
    tipo_mensaje: { type: sql.NVarChar, value: 'TEXTO' },
  });
  setImmediate(() => _notificarRoom(id_sala, myId, myName, mensaje));
  return rows?.[0];
}

async function getMyChats(myId) {
  return queryP(Q.getMyChats, { id_usuario: { type: sql.Int, value: myId } });
}

async function getMessages(idSala, myId) {
  return queryP(Q.getMensajes, {
    id_sala:    { type: sql.Int, value: idSala },
    id_usuario: { type: sql.Int, value: myId },
  });
}

async function _notificarRoom(idSala, senderId, senderName, messageText) {
  try {
    const rows   = await queryP(Q.getTokensParaRoom, {
      idSala:   { type: sql.Int, value: idSala },
      senderId: { type: sql.Int, value: senderId },
    });
    if (!rows.length) return;
    await sendMulticastNotification(rows.map((r) => r.fcm_token), senderName, messageText, {
      tipo: 'CHAT_MESSAGE', id_sala: idSala, click_action: 'FLUTTER_NOTIFICATION_CLICK',
    });
  } catch (e) {
    console.error('Error push chat:', e);
  }
}

module.exports = { initPrivateChat, createGroup, sendMessage, getMyChats, getMessages };
