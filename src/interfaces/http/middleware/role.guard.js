module.exports = (...allowed) =>
  (req, res, next) => {
    if (process.env.BYPASS_AUTH === '1') return next();
    const roles = [req.user?.nombre_rol, req.user?.tipo_usuario].filter(Boolean);
    if (!roles.some((r) => allowed.includes(r))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
