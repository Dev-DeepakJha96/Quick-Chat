const jwt = require('jsonwebtoken');
const config = require('../config/env.config');

const ISSUER = 'quick-chat';
const AUDIENCE = 'quick-chat';

const signAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
};

const signRefreshToken = (userId) => {
  return jwt.sign({ sub: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
