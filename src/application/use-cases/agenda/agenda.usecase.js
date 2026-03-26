const { sql, queryP } = require('../../../infrastructure/database/db');
const { saveOptimizedImage } = require('../../../infrastructure/storage/image.storage');
const { sendPushNotification } = require('../../../infrastructure/notifications/firebase.provider');
const { AGENDA_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/app.error');

async function createActividad({ titulo, descripcion, fecha_evento, hora_evento, estado_publicacion, dias_anticipacion }, file) {
  if (!titulo || !fecha_evento) throw new BadRequestError('titulo y fecha_evento requeridos');

  let imagenUrl = null;
  if (file) {
    imagenUrl = await saveOptimizedImage(file, {
      prefix: 'evento', maxW: 1280, maxH: 1280, quality: 75, folder: 'edi301/eventos',
    });
  }

  const rows = await queryP(Q.create, {
    titulo:             { type: sql.NVarChar, value: titulo },
    descripcion:        { type: sql.NVarChar, value: descripcion ?? null },
    fecha_evento:       { type: sql.Date,     value: fecha_evento },
    hora_evento:        { type: sql.NVarChar, value: hora_evento ?? null },
    imagen:             { type: sql.NVarChar, value: imagenUrl },
    estado_publicacion: { type: sql.NVarChar, value: estado_publicacion ?? 'Publicada' },
    dias_anticipacion:  { type: sql.Int,      value: dias_anticipacion || 3 },
  });

  // Notificar en background
  setImmediate(() => _notificarEvento(titulo, rows[0].id_actividad));

  return rows[0];
}

async function updateActividad(id, data, file) {
  let imagenUrl;
  if (file) {
    imagenUrl = await saveOptimizedImage(file, {
      prefix: 'evento', maxW: 1280, maxH: 1280, quality: 75, folder: 'edi301/eventos',
    });
  }

  const params = {
    id_actividad:       { type: sql.Int,      value: id },
    titulo:             { type: sql.NVarChar, value: data.titulo },
    descripcion:        { type: sql.NVarChar, value: data.descripcion },
    fecha_evento:       { type: sql.Date,     value: data.fecha_evento },
    hora_evento:        { type: sql.NVarChar, value: data.hora_evento ?? null },
    estado_publicacion: { type: sql.NVarChar, value: data.estado_publicacion ?? null },
    dias_anticipacion:  { type: sql.Int,      value: data.dias_anticipacion ?? null },
    imagen:             { type: sql.NVarChar, value: imagenUrl ?? null },
  };

  const rows = await queryP(Q.update, params);
  if (!rows || !rows.length) throw new NotFoundError('No se pudo actualizar el evento');
  return rows[0];
}

async function listActividades({ estado, desde, hasta }) {
  return queryP(Q.list, {
    estado: { type: sql.NVarChar, value: estado ?? null },
    desde:  { type: sql.Date,    value: desde ?? null },
    hasta:  { type: sql.Date,    value: hasta ?? null },
  });
}

async function removeActividad(id) {
  await queryP(Q.remove, { id_actividad: { type: sql.Int, value: id } });
}

async function _notificarEvento(titulo, id_actividad) {
  try {
    const usuarios = await queryP(Q.allTokens);
    for (const u of usuarios) {
      await sendPushNotification(u.fcm_token, '📅 Nuevo Evento', titulo, {
        tipo: 'EVENTO', id_referencia: id_actividad.toString(),
      });
    }
  } catch (e) {
    console.error('Error notificaciones evento:', e);
  }
}

module.exports = { createActividad, updateActividad, listActividades, removeActividad };
