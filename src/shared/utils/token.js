const { v4: uuid } = require('uuid');
const newSessionToken = () => uuid();
module.exports = { newSessionToken };
