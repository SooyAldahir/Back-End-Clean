const { ok, created, bad, notFound, fail } = require('../../../shared/utils/http.response');

class FamiliaController {
  constructor(uc) {
    this.list = async (_req, res) => {
      try { ok(res, await uc.listFamilias()); } catch(e) { fail(res, e); }
    };
    this.listAvailable = async (_req, res) => {
      try { ok(res, await uc.listAvailable()); } catch(e) { fail(res, e); }
    };
    this.reporteCompleto = async (_req, res) => {
      try { ok(res, await uc.reporteCompleto()); } catch(e) { fail(res, e); }
    };
    this.get = async (req, res) => {
      try { ok(res, await uc.getFamilia(Number(req.params.id))); }
      catch(e) { e.statusCode === 404 ? notFound(res) : fail(res, e); }
    };
    this.byIdent = async (req, res) => {
      try { ok(res, await uc.searchByIdent(req.params.ident)); } catch(e) { fail(res, e); }
    };
    this.searchByName = async (req, res) => {
      try { ok(res, await uc.searchByName(req.query.name || req.query.q || '')); } catch(e) { fail(res, e); }
    };
    this.create = async (req, res) => {
      try {
        const familia = await uc.createFamilia(req.body);
        req.io?.to('institucional').emit('familia_creada', familia);
        created(res, familia);
      } catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
    this.update = async (req, res) => {
      try { ok(res, await uc.updateFamilia(Number(req.params.id), req.body)); }
      catch(e) { e.statusCode === 404 ? notFound(res) : fail(res, e); }
    };
    this.remove = async (req, res) => {
      try { ok(res, await uc.removeFamilia(Number(req.params.id))); }
      catch(e) { e.statusCode === 404 ? notFound(res) : fail(res, e); }
    };
    this.uploadFotos = async (req, res) => {
      try { ok(res, await uc.uploadFamiliaFotos(Number(req.params.id), req.files)); }
      catch(e) { e.statusCode === 400 ? bad(res, e.message) : fail(res, e); }
    };
    this.searchByDocument = async (req, res) => {
      try { ok(res, await uc.searchByDocument(req.query)); } catch(e) { fail(res, e); }
    };
    this.updateDescripcion = async (req, res) => {
      try { ok(res, await uc.updateDescripcion(Number(req.params.id), req.body.descripcion)); }
      catch(e) { fail(res, e); }
    };
  }
}

module.exports = FamiliaController;
