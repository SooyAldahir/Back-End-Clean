const { sql, queryP } = require('../../../infrastructure/database/db');

async function globalSearch(q) {
  if (!q) return { alumnos: [], empleados: [], familias: [] };

  const params = { q: { type: sql.NVarChar, value: `%${q}%` } };

  const [alumnos, empleados, familias] = await Promise.all([
    queryP(
      `SELECT id_usuario, nombre, apellido, tipo_usuario, matricula, num_empleado
       FROM EDI.Usuarios
       WHERE tipo_usuario = 'ALUMNO'
         AND (CAST(matricula AS NVARCHAR) LIKE @q OR nombre LIKE @q OR apellido LIKE @q)`,
      params,
    ),
    queryP(
      `SELECT id_usuario, nombre, apellido, tipo_usuario, matricula, num_empleado
       FROM EDI.Usuarios
       WHERE tipo_usuario = 'EMPLEADO'
         AND (CAST(num_empleado AS NVARCHAR) LIKE @q OR nombre LIKE @q OR apellido LIKE @q)`,
      params,
    ),
    queryP(
      `SELECT id_familia, nombre_familia, residencia
       FROM EDI.Familias_EDI
       WHERE nombre_familia LIKE @q`,
      params,
    ),
  ]);

  return { alumnos, empleados, familias };
}

module.exports = { globalSearch };
