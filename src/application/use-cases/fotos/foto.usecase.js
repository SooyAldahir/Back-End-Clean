const { sql, queryP } = require('../../../infrastructure/database/db');
const { FOTO_QUERIES: Q } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError } = require('../../../shared/errors/app.error');

async function addFoto({ id_post, url_foto }, io) {
  if (!id_post || !url_foto) throw new BadRequestError('id_post y url_foto requeridos');

  const rows = await queryP(Q.add, {
    id_post:  { type: sql.Int,      value: id_post },
    url_foto: { type: sql.NVarChar, value: url_foto },
  });

  // Notificar por socket a la familia dueña del post
  const info = await queryP(Q.getPostFamilia, { id_post: { type: sql.Int, value: Number(id_post) } });
  const id_familia = info?.[0]?.id_familia;
  if (id_familia && io) {
    io.to(`familia_${id_familia}`).emit('foto_agregada', rows[0]);
  }

  return rows[0];
}

async function listByPost(id_post) {
  return queryP(Q.listByPost, { id_post: { type: sql.Int, value: Number(id_post) } });
}

async function listByFamilia(id_familia) {
  return queryP(Q.getByFamilia, { id_familia: { type: sql.Int, value: id_familia } });
}

module.exports = { addFoto, listByPost, listByFamilia };
