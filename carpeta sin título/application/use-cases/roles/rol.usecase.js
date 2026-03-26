const { sql, queryP } = require('../../../infrastructure/database/db');
const { BadRequestError } = require('../../../shared/errors/app.error');

async function listRoles() {
  return queryP('SELECT * FROM EDI.Roles WHERE activo = 1');
}

async function createRol({ nombre_rol, descripcion }) {
  if (!nombre_rol) throw new BadRequestError('nombre_rol requerido');
  const rs = await queryP(
    `INSERT INTO EDI.Roles (nombre_rol, descripcion) OUTPUT INSERTED.* VALUES (@nombre_rol, @descripcion)`,
    {
      nombre_rol:  { type: sql.NVarChar, value: nombre_rol },
      descripcion: { type: sql.NVarChar, value: descripcion ?? null },
    },
  );
  return rs[0];
}

async function bulkRoles(roles = []) {
  if (!Array.isArray(roles) || !roles.length) throw new BadRequestError('roles[] requerido');
  for (const r of roles) {
    await queryP(
      `IF NOT EXISTS (SELECT 1 FROM EDI.Roles WHERE nombre_rol = @nombre_rol)
         INSERT INTO EDI.Roles (nombre_rol, descripcion) VALUES (@nombre_rol, @descripcion)`,
      {
        nombre_rol:  { type: sql.NVarChar, value: r.nombre_rol },
        descripcion: { type: sql.NVarChar, value: r.descripcion ?? null },
      },
    );
  }
  return { inserted: true };
}

module.exports = { listRoles, createRol, bulkRoles };
