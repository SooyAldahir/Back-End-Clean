const UC = require('../../../application/use-cases/chat/chat.usecase');
const { ok, created, bad, fail } = require('../../../shared/utils/http.response');

const _userId = (req) => req.user?.id_usuario ?? req.user?.id;

exports.initPrivateChat = async (req, res) => {
  try {
    const result = await UC.initPrivateChat(_userId(req), req.body.targetUserId);
    result.created ? created(res, result) : ok(res, result);
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.createGroup = async (req, res) => {
  try {
    created(res, await UC.createGroup(_userId(req), req.body));
  } catch (e) {
    e.statusCode === 400 ? bad(res, e.message) : fail(res, e);
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const myId      = _userId(req);
    const myName    = req.user?.nombre || 'Alguien';
    const mensaje   = await UC.sendMessage(req.body, myId, myName);
    if (req.io && mensaje) req.io.to(`sala_${req.body.id_sala}`).emit('nuevo_mensaje', mensaje);
    ok(res, { message: 'Enviado' });
  } catch (e) { fail(res, e); }
};

exports.getMyChats = async (req, res) => {
  try { ok(res, await UC.getMyChats(_userId(req))); } catch (e) { fail(res, e); }
};

exports.getMessages = async (req, res) => {
  try {
    ok(res, await UC.getMessages(req.params.id_sala, _userId(req)));
  } catch (e) { fail(res, e); }
};
