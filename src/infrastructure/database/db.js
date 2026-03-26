const sql = require('mssql');
const dbConfig = require('../../config/database');

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

pool.on('error', (err) => {
  console.error('Error en pool de BD:', err);
});

/**
 * Ejecuta una query parametrizada.
 * @param {string} query
 * @param {Object} params  { key: { type: sql.Type, value: any } }
 * @returns {Promise<Array>}
 */
async function queryP(query, params = {}) {
  await poolConnect;
  const request = pool.request();
  for (const [key, { type, value }] of Object.entries(params)) {
    request.input(key, type ?? sql.NVarChar, value);
  }
  const result = await request.query(query);
  return result.recordset;
}

/**
 * Devuelve el pool ya conectado (para transacciones manuales).
 */
async function getConnection() {
  await poolConnect;
  return pool;
}

module.exports = { sql, pool, queryP, getConnection };
