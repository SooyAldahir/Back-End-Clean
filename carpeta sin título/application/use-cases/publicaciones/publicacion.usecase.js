const { sql, queryP } = require('../../../infrastructure/database/db');
const { saveOptimizedImage } = require('../../../infrastructure/storage/image.storage');
const { sendPushNotification } = require('../../../infrastructure/notifications/firebase.provider');
const { PUBLICACION_QUERIES: Q, AGENDA_QUERIES: AQ } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../../shared/errors/app.error');

const ROLES_AUTORIDAD = ['Admin', 'PapaEDI', 'MamaEDI', 'Padre', 'Madre', 'Tutor'];
const ROLES_ADMIN     = ['Admin', 'PapaEDI', 'MamaEDI', 'Padre', 'Madre', 'Tutor'];
const ESTADOS_VALIDOS = ['Pendiente', 'Aprobada', 'Rechazada', 'Publicado'];

function _paginacion(query) {
  const page   = Math.max(parseInt(query.page)  || 1, 1);
  const limit  = Math.min(Math.max(parseInt(query.limit) || 50, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

async function createPublicacion({ id_familia, categoria_post, mensaje, tipo }, id_usuario, file) {
  if (!id_usuario || !categoria_post) throw new BadRequestError('Faltan datos requeridos');

  let url_imagen = null;
  if (file) {
    url_imagen = await saveOptimizedImage(file, {
      prefix: 'post', maxW: 1280, maxH: 1280, quality: 75, folder: 'edi301/posts',
    });
  }

  const userRows = await queryP(Q.getUserRole, { id_usuario: { type: sql.Int, value: id_usuario } });
  if (!userRows.length) throw new BadRequestError('Usuario no encontrado');

  const usuario       = userRows[0];
  const rol           = String(usuario.nombre_rol || '');
  const esAutoridad   = ROLES_AUTORIDAD.some((r) => rol.includes(r));
  const estadoInicial = esAutoridad ? 'Publicado' : 'Pendiente';
  const tipoFinal     = tipo || 'POST';

  const rows = await queryP(Q.create, {
    id_familia:     { type: sql.Int,      value: id_familia ? Number(id_familia) : null },
    id_usuario:     { type: sql.Int,      value: id_usuario },
    categoria_post: { type: sql.NVarChar, value: categoria_post },
    mensaje:        { type: sql.NVarChar, value: mensaje ?? null },
    url_imagen:     { type: sql.NVarChar, value: url_imagen },
    estado:         { type: sql.NVarChar, value: estadoInicial },
    tipo:           { type: sql.NVarChar, value: tipoFinal },
  });

  const post = rows[0];
  if (!post) throw new Error('No se pudo crear la publicación');

  // Notificaciones en background
  setImmediate(() => _notificarPublicacion(post, estadoInicial, id_familia, usuario, id_usuario, tipoFinal));

  return post;
}

async function listByFamilia(id_familia, query, id_usuario) {
  const { page, limit, offset } = _paginacion(query);
  const rows = await queryP(Q.listByFamilia, {
    id_familia:      { type: sql.Int, value: Number(id_familia) },
    current_user_id: { type: sql.Int, value: id_usuario },
    offset:          { type: sql.Int, value: offset },
    limit:           { type: sql.Int, value: limit },
  });
  return { page, limit, count: rows.length, hasMore: rows.length === limit, data: rows };
}

async function listInstitucional() {
  return queryP(Q.listInstitucional);
}

async function listGlobal(query, id_usuario) {
  const { page, limit, offset } = _paginacion(query);
  const posts   = await queryP(Q.listGlobal, {
    current_user_id: { type: sql.Int, value: id_usuario },
    offset:          { type: sql.Int, value: offset },
    limit:           { type: sql.Int, value: limit },
  });
  const eventos = page === 1 ? await queryP(AQ.getActiveEvents) : [];
  const feed    = [...(eventos || []), ...(posts || [])];
  return { page, limit, count: feed.length, hasMore: posts.length === limit, data: feed };
}

async function listPendientes(id_familia) {
  return queryP(Q.listPendientesPorFamilia, { id_familia: { type: sql.Int, value: Number(id_familia) } });
}

async function listByUsuario(id_usuario) {
  return queryP(Q.listByUsuario, { id_usuario: { type: sql.Int, value: id_usuario } });
}

async function setEstado(id_post, estado) {
  if (!ESTADOS_VALIDOS.includes(estado)) throw new BadRequestError('estado inválido');

  const postInfo = await queryP(Q.getPostInfo, { id_post: { type: sql.Int, value: id_post } });
  if (!postInfo.length) throw new NotFoundError('Publicación no encontrada');

  const rows = await queryP(Q.setEstado, {
    estado:  { type: sql.NVarChar, value: estado },
    id_post: { type: sql.Int,      value: id_post },
  });

  const { fcm_token, nombre } = postInfo[0];
  if (fcm_token && (estado === 'Publicado' || estado === 'Aprobada' || estado === 'Rechazada')) {
    const titulo = estado === 'Rechazada' ? 'Publicación Rechazada 👮‍♂️' : '¡Publicación Aprobada! 🎉';
    const cuerpo = estado === 'Rechazada'
      ? 'Tu padre/tutor ha rechazado tu solicitud.'
      : 'Tu publicación ya está visible para la familia.';
    setImmediate(() => sendPushNotification(fcm_token, titulo, cuerpo, { tipo: 'ESTADO_POST', id_referencia: id_post.toString() }));
  }

  return rows[0];
}

async function removePublicacion(id_post) {
  await queryP(Q.softDelete, { id_post: { type: sql.Int, value: id_post } });
}

async function toggleLike(id_post, id_usuario) {
  const result = await queryP(Q.toggleLike, {
    id_post:    { type: sql.Int, value: id_post },
    id_usuario: { type: sql.Int, value: id_usuario },
  });
  const liked = result[0]?.liked == 1;

  if (liked) {
    setImmediate(async () => {
      const [ownerRows, actorRows] = await Promise.all([
        queryP(Q.getPostOwner, { id_post: { type: sql.Int, value: id_post } }),
        queryP(Q.getUserBasicInfo, { id_usuario: { type: sql.Int, value: id_usuario } }),
      ]);
      const owner = ownerRows[0];
      const actor = actorRows[0];
      if (owner && actor && owner.id_usuario !== id_usuario && owner.fcm_token) {
        const actorNombre = `${actor.nombre ?? ''} ${actor.apellido ?? ''}`.trim();
        sendPushNotification(owner.fcm_token, 'Nuevo me gusta', `${actorNombre} reaccionó a tu publicación.`, { tipo: 'NUEVO_LIKE', id_referencia: id_post.toString() });
      }
    });
  }

  return result[0];
}

async function addComentario(id_post, id_usuario, contenido) {
  if (!contenido) throw new BadRequestError('Contenido requerido');

  await queryP(Q.addComentario, {
    id_post:    { type: sql.Int,      value: id_post },
    id_usuario: { type: sql.Int,      value: id_usuario },
    contenido:  { type: sql.NVarChar, value: contenido },
  });

  setImmediate(async () => {
    const [ownerRows, actorRows] = await Promise.all([
      queryP(Q.getPostOwner, { id_post: { type: sql.Int, value: id_post } }),
      queryP(Q.getUserBasicInfo, { id_usuario: { type: sql.Int, value: id_usuario } }),
    ]);
    const owner = ownerRows[0];
    const actor = actorRows[0];
    if (owner && actor && owner.id_usuario !== id_usuario && owner.fcm_token) {
      const nombre = `${actor.nombre ?? ''} ${actor.apellido ?? ''}`.trim();
      sendPushNotification(owner.fcm_token, 'Nuevo comentario', `${nombre} comentó tu publicación.`, { tipo: 'NUEVO_COMENTARIO', id_referencia: id_post.toString() });
    }
  });
}

async function getComentarios(id_post) {
  return queryP(Q.getComentarios, { id_post: { type: sql.Int, value: id_post } });
}

async function deleteComentario(id_comentario, id_usuario_solicitante, userRol) {
  const check = await queryP(Q.getCommentOwner, { id: { type: sql.Int, value: id_comentario } });
  if (!check.length) throw new NotFoundError('Comentario no encontrado');

  const esAdmin = ['Admin', 'PapaEDI', 'MamaEDI'].some((r) => (userRol || '').includes(r));
  if (check[0].id_usuario !== id_usuario_solicitante && !esAdmin) {
    throw new ForbiddenError('No puedes borrar este comentario');
  }

  await queryP(Q.softDeleteComment, { id: { type: sql.Int, value: id_comentario } });
}

async function _notificarPublicacion(post, estadoInicial, id_familia, usuario, id_usuario, tipoFinal) {
  try {
    if (estadoInicial === 'Pendiente' && id_familia) {
      const padres = await queryP(Q.getTokensPadres, { id_familia: { type: sql.Int, value: id_familia } });
      for (const p of padres) {
        if (!p.fcm_token) continue;
        await sendPushNotification(p.fcm_token, 'Solicitud de Publicación 📝',
          `${usuario.nombre} quiere subir ${tipoFinal === 'STORY' ? 'una historia' : 'un post'}.`,
          { tipo: 'SOLICITUD', id_referencia: post.id_post.toString() });
      }
    } else if (estadoInicial === 'Publicado') {
      const autorNombre = `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim();
      let destinatarios = [];
      if (post.id_familia) {
        destinatarios = await queryP(Q.getFamilyTokensForNotif, {
          id_familia:          { type: sql.Int, value: post.id_familia },
          id_usuario_excluir:  { type: sql.Int, value: id_usuario },
        });
      } else {
        destinatarios = await queryP(Q.getGlobalTokensForNotif, {
          id_usuario_excluir: { type: sql.Int, value: id_usuario },
        });
      }
      for (const d of destinatarios) {
        if (d.fcm_token) {
          await sendPushNotification(d.fcm_token, 'Nueva publicación', `${autorNombre} publicó algo nuevo.`, {
            tipo: 'NUEVA_PUBLICACION', id_referencia: post.id_post.toString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error notif publicación:', e);
  }
}

module.exports = {
  createPublicacion, listByFamilia, listInstitucional, listGlobal,
  listPendientes, listByUsuario, setEstado, removePublicacion,
  toggleLike, addComentario, getComentarios, deleteComentario,
};
