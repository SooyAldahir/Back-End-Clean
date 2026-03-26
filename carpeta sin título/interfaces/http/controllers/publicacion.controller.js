const UC = require('../../../application/use-cases/publicaciones/publicacion.usecase');
const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

const _userId = (req) => req.user?.id_usuario ?? req.user?.id ?? req.user?.userId;

exports.create = async (req, res) => {
  try {
    const id_usuario = _userId(req);
    const post = await UC.createPublicacion(req.body, id_usuario, req.files?.imagen);
    created(res, post);

    const io = req.io;
    if (io && post) {
      if (post.id_familia) {
        io.to(`familia_${post.id_familia}`).emit('post_creado', post);
        if (post.estado === 'Pendiente') io.to(`familia_${post.id_familia}`).emit('post_pendiente_creado', post);
      } else {
        io.to('institucional').emit('post_creado', post);
      }
      io.emit('feed_actualizado', { source: 'publicaciones', id_post: post.id_post });
    }
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.listByFamilia = async (req, res) => {
  try {
    ok(res, await UC.listByFamilia(req.params.id_familia, req.query, _userId(req)));
  } catch (e) { fail(res, e); }
};

exports.listInstitucional = async (_req, res) => {
  try { ok(res, await UC.listInstitucional()); } catch (e) { fail(res, e); }
};

exports.listGlobal = async (req, res) => {
  try {
    ok(res, await UC.listGlobal(req.query, _userId(req)));
  } catch (e) { fail(res, e); }
};

exports.listPendientes = async (req, res) => {
  try { ok(res, await UC.listPendientes(req.params.id_familia)); } catch (e) { fail(res, e); }
};

exports.listByUsuario = async (req, res) => {
  try {
    const id_usuario = _userId(req);
    if (id_usuario === undefined || id_usuario === null) return bad(res, 'ID de usuario no encontrado en token');
    ok(res, await UC.listByUsuario(id_usuario));
  } catch (e) { fail(res, e); }
};

exports.setEstado = async (req, res) => {
  try {
    const updated = await UC.setEstado(Number(req.params.id), req.body.estado);
    ok(res, updated);

    const io = req.io;
    if (io && updated) {
      const room = updated.id_familia ? `familia_${updated.id_familia}` : 'institucional';
      io.to(room).emit('post_estado_actualizado', updated);
      if (updated.id_usuario) io.to(`user_${updated.id_usuario}`).emit('mi_post_estado_actualizado', updated);
      io.emit('feed_actualizado', { source: 'publicaciones', id_post: updated.id_post });
    }
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : e.statusCode === 404 ? notFound(res, e.message) : fail(res, e);
  }
};

exports.remove = async (req, res) => {
  try {
    const idPost = Number(req.params.id);
    await UC.removePublicacion(idPost);
    ok(res, { message: 'Publicación eliminada' });
    req.io?.emit('post_eliminado', { id_post: idPost });
    req.io?.emit('feed_actualizado', { source: 'publicaciones', id_post: idPost });
  } catch (e) { fail(res, e); }
};

exports.toggleLike = async (req, res) => {
  try {
    const id_post    = Number(req.params.id);
    const id_usuario = _userId(req);
    const result     = await UC.toggleLike(id_post, id_usuario);
    ok(res, result);
    req.io?.emit('feed_actualizado', { source: 'publicaciones', id_post });
  } catch (e) { fail(res, e); }
};

exports.addComentario = async (req, res) => {
  try {
    const id_post    = Number(req.params.id);
    const id_usuario = _userId(req);
    await UC.addComentario(id_post, id_usuario, req.body.contenido);
    created(res, { message: 'Comentario agregado' });
    req.io?.emit('feed_actualizado', { source: 'publicaciones', id_post });
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.getComentarios = async (req, res) => {
  try { ok(res, await UC.getComentarios(Number(req.params.id))); } catch (e) { fail(res, e); }
};

exports.deleteComentario = async (req, res) => {
  try {
    const id_usuario = _userId(req);
    const userRol    = req.user?.nombre_rol || req.user?.rol || '';
    await UC.deleteComentario(Number(req.params.id), id_usuario, userRol);
    ok(res, { message: 'Comentario eliminado' });
    req.io?.emit('feed_actualizado', { source: 'publicaciones' });
  } catch (e) {
    if (e.statusCode === 403) return res.status(403).json({ message: e.message });
    if (e.statusCode === 404) return notFound(res, e.message);
    fail(res, e);
  }
};
