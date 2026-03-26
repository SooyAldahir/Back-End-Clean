const { BadRequestError, NotFoundError } = require('../../../shared/errors/app.error');

class FamiliaUseCase {
  constructor(db, queries, imageStorage, notifications) {
    this.sql           = db.sql;
    this.queryP        = db.queryP;
    this.getConnection = db.getConnection;
    this.Q             = queries.FAMILIA_QUERIES;
    this.MQ            = queries.MIEMBRO_QUERIES;
    this.imageStorage  = imageStorage;
    this.notifications = notifications;
  }

  async listFamilias()    { return this.queryP(this.Q.list); }
  async listAvailable()   { return this.queryP(this.Q.listAvailable); }
  async reporteCompleto() { return this.queryP(this.Q.reporteCompleto); }

  async getFamilia(id) {
    const rows = await this.queryP(this.Q.byId, {
      id_familia: { type: this.sql.Int, value: id },
    });
    if (!rows.length) throw new NotFoundError('Familia no encontrada');
    const familia = rows[0];
    // Cargar miembros igual que el original
    familia.miembros = await this.queryP(this.MQ.listByFamilia, {
      id_familia: { type: this.sql.Int, value: id },
    });
    return familia;
  }

  async searchByName(name) {
    return this.queryP(this.Q.byName, {
      like: { type: this.sql.NVarChar, value: `%${name}%` },
    });
  }

  async searchByIdent(ident) {
    return this.queryP(this.Q.byIdent, {
      ident: { type: this.sql.NVarChar, value: ident },
    });
  }

  async searchByDocument({ matricula, numEmpleado }) {
    return this.queryP(this.Q.byIdent, {
      ident: { type: this.sql.NVarChar, value: matricula || numEmpleado || '' },
    });
  }

  async createFamilia({ nombre_familia, papa_id, mama_id, residencia, direccion, hijos = [] }) {
    if (!nombre_familia || !residencia) throw new BadRequestError('Nombre y residencia son requeridos');

    const conn        = await this.getConnection();
    const transaction = conn.transaction();
    await transaction.begin();

    try {
      const req1 = new this.sql.Request(transaction);
      req1.input('nombre_familia', this.sql.NVarChar, nombre_familia);
      req1.input('residencia',     this.sql.NVarChar, residencia);
      req1.input('direccion',      this.sql.NVarChar, direccion || null);
      const result     = await req1.query(this.Q.insert);
      const id_familia = result.recordset[0]?.id_familia;

      const miembros = [];
      if (papa_id) miembros.push({ id: papa_id, tipo: 'PADRE' });
      if (mama_id) miembros.push({ id: mama_id, tipo: 'MADRE' });
      hijos.forEach(hID => miembros.push({ id: hID, tipo: 'HIJO' }));

      for (const m of miembros) {
        await this._upsertMiembro(transaction, id_familia, m.id, m.tipo);
      }

      await transaction.commit();
      return this.getFamilia(id_familia);
    } catch(e) {
      if (!transaction.rolledBack) await transaction.rollback().catch(() => {});
      throw e;
    }
  }

  async _upsertMiembro(transaction, id_familia, id_usuario, tipo) {
    const req = new this.sql.Request(transaction);
    req.input('id_familia',  this.sql.Int,      id_familia);
    req.input('id_usuario',  this.sql.Int,      id_usuario);
    req.input('tipo',        this.sql.NVarChar, tipo);
    await req.query(`
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

  async updateFamilia(id, data) {
    const { nombre_familia, residencia, direccion } = data;
    await this.queryP(this.Q.update, {
      id_familia:     { type: this.sql.Int,      value: id },
      nombre_familia: { type: this.sql.NVarChar, value: nombre_familia || null },
      residencia:     { type: this.sql.NVarChar, value: residencia     || null },
      direccion:      { type: this.sql.NVarChar, value: direccion      || null },
    });
    return this.getFamilia(id);
  }

  async removeFamilia(id) {
    await this.queryP(this.Q.softDelete, {
      id_familia: { type: this.sql.Int, value: id },
    });
    return { deleted: true };
  }

  async uploadFamiliaFotos(id, files) {
    if (!files) throw new BadRequestError('No se recibieron imágenes');
    const updates = {};
    if (files.foto_perfil) {
      updates.foto_perfil_url = await this.imageStorage.saveOptimizedImage(files.foto_perfil, 'familia_perfil');
    }
    if (files.foto_portada) {
      updates.foto_portada_url = await this.imageStorage.saveOptimizedImage(files.foto_portada, 'familia_portada');
    }
    await this.queryP(this.Q.updateFotos, {
      id_familia:      { type: this.sql.Int,      value: id },
      foto_perfil_url: { type: this.sql.NVarChar, value: updates.foto_perfil_url  || null },
      foto_portada_url:{ type: this.sql.NVarChar, value: updates.foto_portada_url || null },
    });
    return updates;
  }

  async updateDescripcion(id, descripcion) {
    await this.queryP(this.Q.update, {
      id_familia:  { type: this.sql.Int,      value: id },
      descripcion: { type: this.sql.NVarChar, value: descripcion || '' },
    });
    return this.getFamilia(id);
  }
}

module.exports = FamiliaUseCase;
