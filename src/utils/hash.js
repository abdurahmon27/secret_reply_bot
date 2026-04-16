/**
 * @file HMAC sender-hash computation — the one-way identifier for message senders.
 * Never invertible. Stable across the lifetime of HMAC_SECRET.
 */

'use strict';

const crypto = require('crypto');
const { env } = require('../config');

/**
 * Compute the HMAC sender hash for a Telegram user ID.
 * @param {number|string|bigint} telegramId
 * @returns {string} 64-char hex SHA-256 HMAC digest
 */
function senderHash(telegramId) {
  return crypto
    .createHmac('sha256', env.HMAC_SECRET)
    .update(String(telegramId))
    .digest('hex');
}

module.exports = { senderHash };
