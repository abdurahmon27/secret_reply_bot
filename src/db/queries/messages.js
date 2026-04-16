/**
 * @file Messages table queries — create/lookup anonymous messages and reply threads.
 */

'use strict';

const { query } = require('../index');

/**
 * @param {{senderHash:string, recipientId:number, contentType:string, content:object, inReplyTo?:number|null}} params
 * @returns {Promise<object>}
 */
async function create({ senderHash, recipientId, contentType, content, inReplyTo = null }) {
  const { rows } = await query(
    `
    INSERT INTO messages (sender_hash, recipient_id, content_type, content, in_reply_to)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [senderHash, recipientId, contentType, content, inReplyTo],
  );
  return rows[0];
}

/** @param {number} id */
async function findById(id) {
  const { rows } = await query('SELECT * FROM messages WHERE id = $1', [id]);
  return rows[0] || null;
}

/** @param {number} id */
async function markRead(id) {
  await query('UPDATE messages SET is_read = TRUE WHERE id = $1', [id]);
}

module.exports = { create, findById, markRead };
