const ok      = (res, data)          => res.status(200).json(data);
const created  = (res, data)          => res.status(201).json(data);
const bad      = (res, msg = 'Datos inválidos') => res.status(400).json({ error: msg });
const notFound = (res, msg = 'No encontrado')   => res.status(404).json({ error: msg });
const forbidden= (res, msg = 'Acceso denegado') => res.status(403).json({ error: msg });
const fail     = (res, err) => {
  console.error('Error interno:', err);
  if (!res.headersSent) res.status(500).json({ error: 'Error interno del servidor' });
};

module.exports = { ok, created, bad, notFound, forbidden, fail };
