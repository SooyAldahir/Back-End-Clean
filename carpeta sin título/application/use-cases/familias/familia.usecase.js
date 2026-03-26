const { sql, pool, queryP } = require('../../../infrastructure/database/db');
const { saveOptimizedImage } = require('../../../infrastructure/storage/image.storage');
const { sendMulticastNotification } = require('../../../infrastructure/notifications/firebase.provider');
const { FAMILIA_QUERIES: Q } = require('../../../domain/repositories/queries/familia.queries');
const { MIEMBRO_QUERIES: MQ } = require('../../../domain/repositories/queries/index.queries');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/app.error');

async function listFamilias() {
  return queryP(Q.list);
}

async function getFamilia(id) {
  const rows = await queryP(Q.byId, { id_familia: { type: sql.Int, value: id } });
  if (!rows.length) throw new NotFoundError('Familia no encontrada');
  const familia = rows[0];
  familia.miembros = await queryP(MQ.listByFamilia, { id_familia: { type: sql.Int, value: id } });
  return familia;
}

async function createFamilia({ nombre_familia, papa_id, mama_id, residencia, direccion, hijos = [] }) {
  if (!nombre_familia || !residencia) throw new BadRequestError('Faltan datos obligatorios');

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const req = new sql.Request(transaction);
    req.input('nombre_familia', sql.NVarChar, nombre_familia);
    req.input('residencia',     sql.NVarChar, residencia);
    req.input('direccion',      sql.NVarChar, direccion ?? null);
    req.input('papa_id',        sql.Int,      papa_id ?? null);
    req.input('mama_id',        sql.Int,      mama_id ?? null);

    const familiaResult = await req.query(`
      INSERT INTO EDI.Familias_EDI (nombre_familia, residencia, direccion, papa_id, mama_id)
      OUTPUT INSERTED.id_familia
      VALUES (@nombre_familia, @residencia, @direccion, @papa_id, @mama_id)
    `);
    const id_familia = familiaResult.recordset[0].id_familia;

    const miembros = [];
    if (papa_id) miembros.push({ id: papa_id, tipo: 'PADRE' });
    if (mama_id) miembros.push({ id: mama_id, tipo: 'MADRE' });
    if (Array.isArray(hijos)) hijos.forEach((hID) => miembros.push({ id: hID, tipo: 'HIJO' }));

    for (const m of miembros) {
      const mReq = new sql.Request(transaction);
      mReq.input('id_familia',  sql.Int,      id_familia);
      mReq.input('id_usuario',  sql.Int,      m.id);
      mReq.input('tipo',        sql.NVarChar, m.tipo);
      await mReq.query(`
        MERGE EDI.Miembros_Familia AS tgt
        USING (SELECT @id_familia AS id_familia, @id_usuario AS id_usuario) AS src
          ON tgt.id_familia = src.id_familia AND tgt.id_usuario = src.id_usuario
        WHEN MATCHED THEN
          UPDATE SET activo = 1, tipo_miembro = @tipo, updated_at = SYSDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id_familia, id_usuario, tipo_miembro, activo, created_at)
          VALUES (@id_familia, @id_usuario, @tipo, 1, SYSDATETIME());
      `);
    }

    await transaction.commit();

    // Notificaciones en background
    setImmediate(() => _notificarCreacionFamilia(id_familia, nombre_familia, papa_id, mama_id, hijos));

    const finalRows = await queryP(Q.byId, { id_familia: { type: sql.Int, value: id_familia } });
    return finalRows[0];
  } catch (e) {
    if (!transaction.rolledBack) await transaction.rollback().catch(() => {});
    throw e;
  }
}

async function updateFamilia(id, data) {
  await queryP(Q.update, {
    id_familia:     { type: sql.Int,      value: id },
    nombre_familia: { type: sql.NVarChar, value: data.nombre_familia ?? null },
    papa_id:        { type: sql.Int,      value: data.papa_id ?? null },
    mama_id:        { type: sql.Int,      value: data.mama_id ?? null },
    residencia:     { type: sql.NVarChar, value: data.residencia ?? null },
    direccion:      { type: sql.NVarChar, value: data.direccion ?? null },
    descripcion:    { type: sql.NVarChar, value: data.descripcion ?? null },
  });
  const rows = await queryP(Q.byId, { id_familia: { type: sql.Int, value: id } });
  if (!rows.length) throw new NotFoundError();
  return rows[0];
}

async function removeFamilia(id) {
  await queryP(Q.softDelete, { id_familia: { type: sql.Int, value: id } });
}

async function uploadFamiliaFotos(id, files) {
  if (!files) throw new BadRequestError('No se subió ningún archivo');

  const resizeOpts = (tipo) =>
    tipo === 'portada'
      ? { maxW: 1600, maxH: 900, quality: 75, folder: 'edi301/familias/portadas' }
      : { maxW: 512,  maxH: 512, quality: 80, folder: 'edi301/familias/perfiles', fit: 'cover' };

  let urlPortada = null;
  let urlPerfil  = null;

  if (files.foto_portada) {
    urlPortada = await saveOptimizedImage(files.foto_portada, {
      prefix: `familia-${id}-portada`, ...resizeOpts('portada'),
    });
  }
  if (files.foto_perfil) {
    urlPerfil = await saveOptimizedImage(files.foto_perfil, {
      prefix: `familia-${id}-perfil`, ...resizeOpts('perfil'),
    });
  }

  if (!urlPortada && !urlPerfil) throw new BadRequestError('No se subieron archivos válidos');

  await queryP(Q.updateFotos, {
    id_familia:       { type: sql.Int,      value: id },
    foto_portada_url: { type: sql.NVarChar, value: urlPortada },
    foto_perfil_url:  { type: sql.NVarChar, value: urlPerfil },
  });

  const rows = await queryP(Q.byId, { id_familia: { type: sql.Int, value: id } });
  if (!rows.length) throw new NotFoundError();
  return rows[0];
}

async function updateDescripcion(id, descripcion) {
  if (!descripcion || descripcion.trim().length === 0) throw new BadRequestError('Descripción requerida');
  if (descripcion.length > 500) throw new BadRequestError('La descripción excede 500 caracteres');

  await queryP(Q.update, {
    id_familia:     { type: sql.Int,      value: id },
    nombre_familia: { type: sql.NVarChar, value: null },
    residencia:     { type: sql.NVarChar, value: null },
    direccion:      { type: sql.NVarChar, value: null },
    papa_id:        { type: sql.Int,      value: null },
    mama_id:        { type: sql.Int,      value: null },
    descripcion:    { type: sql.NVarChar, value: descripcion.trim() },
  });

  const rows = await queryP(Q.byId, { id_familia: { type: sql.Int, value: id } });
  if (!rows.length) throw new NotFoundError();
  return rows[0];
}

async function searchByName(name) {
  if (!name) return [];
  return queryP(Q.byName, { like: { type: sql.NVarChar, value: `%${name}%` } });
}

async function searchByIdent(ident) {
  if (Number.isNaN(Number(ident))) throw new BadRequestError('ident debe ser numérico');
  return queryP(Q.byIdent, { ident: { type: sql.Int, value: Number(ident) } });
}

async function searchByDocument({ matricula, numEmpleado }) {
  const ident = (matricula || numEmpleado || '').trim();
  if (!ident) return [];
  return queryP(Q.byIdent, { ident: { type: sql.NVarChar, value: ident } });
}

async function reporteCompleto() {
  const rows = await queryP(Q.reporteCompleto);
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.id_familia)) {
      map.set(row.id_familia, {
        id_familia: row.id_familia, nombre_familia: row.nombre_familia,
        residencia: row.residencia, papa_nombre: row.papa_nombre, mama_nombre: row.mama_nombre,
        hijos_en_casa: [], alumnos_asignados: [], total_miembros: 0,
      });
    }
    const f = map.get(row.id_familia);
    if (row.id_usuario) {
      const nombre = row.miembro_nombre;
      if (row.tipo_miembro === 'HIJO' && !f.hijos_en_casa.includes(nombre)) f.hijos_en_casa.push(nombre);
      else if (row.tipo_miembro === 'ALUMNO_ASIGNADO' && !f.alumnos_asignados.includes(nombre)) f.alumnos_asignados.push(nombre);
    }
  }

  map.forEach((f) => {
    let count = (f.papa_nombre ? 1 : 0) + (f.mama_nombre ? 1 : 0) + f.hijos_en_casa.length + f.alumnos_asignados.length;
    f.total_miembros = count;
  });

  return Array.from(map.values());
}

async function listAvailable() {
  const rows = await queryP(Q.listAvailable);
  return rows.map((f) => ({
    ...f,
    padres: f.padres?.endsWith(' & ') ? f.padres.slice(0, -3) : (f.padres || 'Sin padres'),
  }));
}

// ── Internal helpers ──────────────────────────────────────────────────────────
async function _notificarCreacionFamilia(id_familia, nombre_familia, papa_id, mama_id, hijos) {
  try {
    const idsPadres = [papa_id, mama_id].filter(Boolean);
    if (idsPadres.length) {
      const padresData = await queryP(`SELECT id_usuario, fcm_token FROM EDI.Usuarios WHERE id_usuario IN (${idsPadres.join(',')})`);
      const tokens = [];
      for (const p of padresData) {
        await queryP(`INSERT INTO EDI.Notificaciones (id_usuario_destino, titulo, cuerpo, tipo, id_referencia, leido, fecha_creacion) VALUES (@uid, @tit, @body, @tipo, @ref, 0, GETDATE())`, {
          uid:  { type: sql.Int,      value: p.id_usuario },
          tit:  { type: sql.NVarChar, value: '¡Familia Creada! 🏠' },
          body: { type: sql.NVarChar, value: `Bienvenidos a la familia "${nombre_familia}".` },
          tipo: { type: sql.NVarChar, value: 'FAMILIA_CREADA' },
          ref:  { type: sql.Int,      value: id_familia },
        }).catch(() => {});
        if (p.fcm_token) tokens.push(p.fcm_token);
      }
      if (tokens.length) sendMulticastNotification(tokens, '¡Familia Creada! 🏠', `Bienvenidos a la familia "${nombre_familia}".`, { tipo: 'FAMILIA_CREADA', id_familia: id_familia.toString() });
    }

    if (hijos.length) {
      const hijosData = await queryP(`SELECT id_usuario, fcm_token FROM EDI.Usuarios WHERE id_usuario IN (${hijos.join(',')})`);
      const tokens = [];
      for (const h of hijosData) {
        await queryP(`INSERT INTO EDI.Notificaciones (id_usuario_destino, titulo, cuerpo, tipo, id_referencia, leido, fecha_creacion) VALUES (@uid, @tit, @body, @tipo, @ref, 0, GETDATE())`, {
          uid:  { type: sql.Int,      value: h.id_usuario },
          tit:  { type: sql.NVarChar, value: 'Nueva Asignación 🎒' },
          body: { type: sql.NVarChar, value: `Has sido asignado a la familia "${nombre_familia}".` },
          tipo: { type: sql.NVarChar, value: 'ASIGNACION' },
          ref:  { type: sql.Int,      value: id_familia },
        }).catch(() => {});
        if (h.fcm_token) tokens.push(h.fcm_token);
      }
      if (tokens.length) sendMulticastNotification(tokens, 'Nueva Asignación 🎒', `Has sido asignado a la familia "${nombre_familia}".`, { tipo: 'ASIGNACION', id_familia: id_familia.toString() });
    }
  } catch (e) {
    console.error('Error notificaciones creación familia:', e);
  }
}

module.exports = {
  listFamilias, getFamilia, createFamilia, updateFamilia, removeFamilia,
  uploadFamiliaFotos, updateDescripcion, searchByName, searchByIdent,
  searchByDocument, reporteCompleto, listAvailable,
};
