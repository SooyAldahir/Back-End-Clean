const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

const hashPassword    = (plain)          => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (plain, hashed)  => bcrypt.compare(plain, hashed);

module.exports = { hashPassword, comparePassword };
