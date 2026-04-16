/**
 * @file Blocks table queries — (recipient_id, sender_hash) tuples.
 */

'use strict';

const { query } = require('../index');

/**
 * Idempotent — ON CONFLICT does nothing.
 * @param {number} recipientId
 * @param {string} senderHash
 */
async function block(recipientId, senderHash) {
  await query(
    `INSERT INTO blocks (recipient_id, sender_hash)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [recipientId, senderHash],
  );
}

/**
 * @param {number} recipientId
 * @param {string} senderHash
 * @returns {Promise<boolean>}
 */
async function isBlocked(recipientId, senderHash) {
  const { rows } = await query(
    'SELECT 1 FROM blocks WHERE recipient_id = $1 AND sender_hash = $2',
    [recipientId, senderHash],
  );
  return rows.length > 0;
}

module.exports = { block, isBlocked };
