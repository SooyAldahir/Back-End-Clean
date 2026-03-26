const { sql, pool, queryP } = require('../../../infrastructure/database/db');
const { sendPushNotification, sendMulticastNotification } = require('../../../infrastructure/notifications/firebase.provider');
const { BadRequestError } = require('../../../shared/errors/app.error');
const { MIEMBRO_QUERIES: MQ } = require('../../../domain/repositories/queries/index.queries');

async function addMiembro({ id_familia, id_usuario, tipo_miembro }) {
  const rows = await queryP(`
    MERGE EDI.Miembros_Familia AS tgt
    USING (SELECT @id_familia AS id_familia, @id_usuario AS id_usuario) AS src
      ON tgt.id_familia = src.id_familia AND tgt.id_usuario = src.id_usuario
    WHEN MATCHED THEN
      UPDATE SET activo = 1, tipo_miembro = @tipo_miembro, updated_at = SYSDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (id_familia, id_usuario, tipo_miembro, activo, created_at)
      VALUES (@id_familia, @id_usuario, @tipo_miembro, 1, SYSDATETIME())
    OUTPUT INSERTED.id_miembro;
  `, {
    id_familia:   { type: sql.Int,      value: id_familia },
    id_usuario:   { type: sql.Int,      value: id_usuario },
    tipo_miembro: { type: sql.NVarChar, value: tipo_miembro },
  });
  return rows[0];
}

async function byFamilia(id) {
  return queryP(MQ.listByFamilia, { id_familia: { type: sql.Int, value: Number(id) } });
}

async function removeMiembro(id) {
  const info = await queryP(MQ.getFamiliaById, { id: { type: sql.Int, value: id } });
  await queryP(`DELETE FROM EDI.Miembros_Familia WHERE id_miembro = @id`, { id: { type: sql.Int, value: id } });
  return info[0]?.id_familia;
}

async function addBulk({ id_familia, id_usuarios }) {
  const familiaRes = await queryP(MQ.getFamiliaNombre, { id: { type: sql.Int, value: id_familia } });
  const nombreFamilia = familiaRes[0]?.nombre_familia || 'Familia';

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    for (const id_usuario of id_usuarios) {
      const r = new sql.Request(transaction);
      r.input('id_familia',  sql.Int,      id_familia);
      r.input('id_usuario',  sql.Int,      id_usuario);
      r.input('tipo_miembro',sql.NVarChar, 'ALUMNO_ASIGNADO');
      await r.query(`
        MERGE EDI.Miembros_Familia AS tgt
        USING (SELECT @id_familia AS id_familia, @id_usuario AS id_usuario) AS src
          ON tgt.id_familia = src.id_familia AND tgt.id_usuario = src.id_usuario
        WHEN MATCHED THEN
          UPDATE SET activo = 1, tipo_miembro = @tipo_miembro, updated_at = SYSDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id_familia, id_usuario, tipo_miembro, activo, created_at)
          VALUES (@id_familia, @id_usuario, @tipo_miembro, 1, SYSDATETIME());
      `);
    }
    await transaction.commit();
  } catch (e) {
    if (!transaction.rolledBack) await transaction.rollback().catch(() => {});
    throw e;
  }

  setImmediate(() => _notificarBulk(id_familia, id_usuarios, nombreFamilia));
  return { message: `${id_usuarios.length} miembro(s) agregado(s) con éxito.` };
}

async function addAlumnosToFamilia(id_familia, matriculas) {
  if (!Array.isArray(matriculas) || !matriculas.length) throw new BadRequestError('Faltan matrículas');

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const fRes = await new sql.Request(transaction).query(
      `SELECT nombre_familia FROM EDI.Familias_EDI WHERE id_familia = ${id_familia}`,
    );
    const nombreFamilia = fRes.recordset[0]?.nombre_familia || 'Familia';
    const results = { added: [], notFound: [], errors: [], usersNotif: [] };

    for (const matricula of matriculas) {
      try {
        const uRes = await new sql.Request(transaction).query(
          `SELECT id_usuario, fcm_token FROM EDI.Usuarios WHERE matricula = ${parseInt(matricula)}`,
        );
        if (!uRes.recordset.length) { results.notFound.push(matricula); continue; }
        const user = uRes.recordset[0];
        const mReq = new sql.Request(transaction);
        mReq.input('idF', sql.Int, id_familia);
        mReq.input('idU', sql.Int, user.id_usuario);
        await mReq.query(`
          MERGE EDI.Miembros_Familia AS tgt
          USING (SELECT @idF AS id_familia, @idU AS id_usuario) AS src
            ON tgt.id_familia = src.id_familia AND tgt.id_usuario = src.id_usuario
          WHEN MATCHED THEN
            UPDATE SET activo = 1, tipo_miembro = 'HIJO', updated_at = SYSDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (id_familia, id_usuario, tipo_miembro, activo, created_at)
            VALUES (@idF, @idU, 'HIJO', 1, SYSDATETIME());
        `);
        results.added.push(matricula);
        results.usersNotif.push(user);
      } catch (err) {
        results.errors.push(`Matrícula ${matricula}: ${err.message}`);
      }
    }
    await transaction.commit();
    setImmediate(() => _notificarAlumnos(id_familia, results.usersNotif, nombreFamilia, results.added.length));
    return { added: results.added, notFound: results.notFound, errors: results.errors };
  } catch (e) {
    if (!transaction.rolledBack) await transaction.rollback().catch(() => {});
    throw e;
  }
}

async function _notificarBulk(id_familia, id_usuarios, nombreFamilia) {
  try {
    const ids = id_usuarios.map(Number).filter((n) => !isNaN(n));
    if (!ids.length) return;
    const usersData = await queryP(`SELECT id_usuario, fcm_token FROM EDI.Usuarios WHERE id_usuario IN (${ids.join(',')})`);
    const tokens = [];
    for (const u of usersData) {
      queryP(`INSERT INTO EDI.Notificaciones (id_usuario_destino, titulo, cuerpo, tipo, id_referencia, leido, fecha_creacion) VALUES (@uid, @tit, @body, 'ASIGNACION', @ref, 0, GETDATE())`, {
        uid: { type: sql.Int, value: u.id_usuario },
        tit: { type: sql.NVarChar, value: 'Nueva Asignación 🎒' },
        body: { type: sql.NVarChar, value: `Has sido asignado a la familia "${nombreFamilia}".` },
        ref: { type: sql.Int, value: id_familia },
      }).catch(() => {});
      if (u.fcm_token) tokens.push(u.fcm_token);
    }
    if (tokens.length) sendMulticastNotification(tokens, 'Nueva Asignación 🎒', `Has sido asignado a la familia "${nombreFamilia}".`, { tipo: 'ASIGNACION', id_familia: id_familia.toString() });
  } catch (e) { console.error('Error notif bulk:', e); }
}

async function _notificarAlumnos(id_familia, usersNotif, nombreFamilia, cantidad) {
  for (const u of usersNotif) {
    queryP(`INSERT INTO EDI.Notificaciones (id_usuario_destino, titulo, cuerpo, tipo, id_referencia, leido, fecha_creacion) VALUES (@uid, @tit, @body, 'ASIGNACION', @ref, 0, GETDATE())`, {
      uid: { type: sql.Int, value: u.id_usuario },
      tit: { type: sql.NVarChar, value: 'Nueva Asignación 🎒' },
      body: { type: sql.NVarChar, value: `Has sido asignado a la familia "${nombreFamilia}".` },
      ref: { type: sql.Int, value: id_familia },
    });
    if (u.fcm_token) sendPushNotification(u.fcm_token, 'Nueva Asignación 🎒', `Has sido asignado a la familia "${nombreFamilia}".`, { tipo: 'ASIGNACION', id_familia: id_familia.toString() });
  }
  try {
    const padres = await queryP(MQ.getPadresFamilia, { idFam: { type: sql.Int, value: id_familia } });
    const tokens = [];
    for (const p of padres) {
      queryP(`INSERT INTO EDI.Notificaciones (id_usuario_destino, titulo, cuerpo, tipo, id_referencia, leido, fecha_creacion) VALUES (@uid, 'Nuevos Miembros 👶', @body, 'NUEVO_MIEMBRO', @ref, 0, GETDATE())`, {
        uid: { type: sql.Int, value: p.id_usuario },
        body: { type: sql.NVarChar, value: `Se han asignado ${cantidad} nuevos alumnos a tu familia.` },
        ref: { type: sql.Int, value: id_familia },
      });
      if (p.fcm_token) tokens.push(p.fcm_token);
    }
    if (tokens.length) sendMulticastNotification(tokens, 'Nuevos Miembros 👶', `Se han asignado ${cantidad} nuevos alumnos a tu familia.`, { tipo: 'NUEVO_MIEMBRO', id_familia: id_familia.toString() });
  } catch (e) { console.error('Error notif padres:', e); }
}

module.exports = { addMiembro, byFamilia, removeMiembro, addBulk, addAlumnosToFamilia };
