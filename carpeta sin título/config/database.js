module.exports = {
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  server: process.env.DBSERVER || '127.0.0.1',
  database: process.env.DATABASE,
  port: Number(process.env.DBPORT || 1433),
  pool: { max: 10, min: 0, idleTimeoutMillis: 60000 },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};
