const UC = require('../../../application/use-cases/miembros/miembro.usecase');
const { ok, created, fail } = require('../../../shared/utils/http.response');

exports.add = async (req, res) => {
  try {
    const nuevoMiembro = await UC.addMiembro(req.body);
    req.io?.to(`familia_${req.body.id_familia}`).emit('miembro_agregado', { id_familia: req.body.id_familia, nuevoMiembro });
    created(res, nuevoMiembro);
  } catch (e) { fail(res, e); }
};

exports.byFamilia = async (req, res) => {
  try { ok(res, await UC.byFamilia(req.params.id)); } catch (e) { fail(res, e); }
};

exports.remove = async (req, res) => {
  try {
    const id_familia = await UC.removeMiembro(Number(req.params.id));
    if (id_familia) req.io?.to(id_familia.toString()).emit('miembro_eliminado', { id_miembro: Number(req.params.id) });
    ok(res, { message: 'Eliminado' });
  } catch (e) { fail(res, e); }
};

exports.addBulk = async (req, res) => {
  try {
    const result = await UC.addBulk(req.body);
    req.io?.to(`familia_${req.body.id_familia}`).emit('miembros_actualizados', { id_familia: req.body.id_familia });
    ok(res, result);
  } catch (e) { fail(res, e); }
};

exports.addAlumnosToFamilia = async (req, res) => {
  try {
    const result = await UC.addAlumnosToFamilia(req.params.id_familia, req.body.matriculas);
    if (result.added.length) {
      req.io?.to(`familia_${req.params.id_familia}`).emit('nuevos_alumnos_asignados', {
        id_familia: req.params.id_familia, cantidad: result.added.length,
      });
    }
    ok(res, result);
  } catch (e) { fail(res, e); }
};
