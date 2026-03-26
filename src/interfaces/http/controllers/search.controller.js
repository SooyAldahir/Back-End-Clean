const UC = require('../../../application/use-cases/search/search.usecase');

exports.search = async (req, res) => {
  try {
    res.json(await UC.globalSearch((req.query.q || '').trim()));
  } catch (e) {
    console.error('search error:', e);
    res.status(500).json({ error: 'Error interno en búsqueda' });
  }
};
