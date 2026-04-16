/**
 * @file Messages table queries — create/lookup anonymous messages and reply threads.
 */

'use strict';

const { query } = require('../index');

/**
 * @param {{senderHash:string, recipientId:number, contentType:string, content:object, inReplyTo?:number|null, senderTgMessageId?:number|null}} params
 * @returns {Promise<object>}
 */
async function create({
  senderHash,
  recipientId,
  contentType,
  content,
  inReplyTo = null,
  senderTgMessageId = null,
}) {
  const { rows } = await query(
    `
    INSERT INTO messages (sender_hash, recipient_id, content_type, content, in_reply_to, sender_tg_message_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [senderHash, recipientId, contentType, content, inReplyTo, senderTgMessageId],
  );
  return rows[0];
}

/** @param {number} id */
async function findById(id) {
  const { rows } = await query('SELECT * FROM messages WHERE id = $1', [id]);
  return rows[0] || null;
}

/**
 * Look up a delivered card by its telegram message_id in the recipient's chat —
 * used to map a swipe-reply back to the source message.
 * @param {number} recipientId
 * @param {number} tgMessageId
 */
async function findByRecipientTg(recipientId, tgMessageId) {
  const { rows } = await query(
    'SELECT * FROM messages WHERE recipient_id = $1 AND recipient_tg_message_id = $2 LIMIT 1',
    [recipientId, tgMessageId],
  );
  return rows[0] || null;
}

/**
 * Persist the telegram message_id of the content-card we just delivered, so the
 * recipient's future swipe-replies on that card resolve back to this row.
 * @param {number} id
 * @param {number} tgMessageId
 */
async function setRecipientTgMessageId(id, tgMessageId) {
  await query(
    'UPDATE messages SET recipient_tg_message_id = $1 WHERE id = $2',
    [tgMessageId, id],
  );
}

/** @param {number} id */
async function markRead(id) {
  await query('UPDATE messages SET is_read = TRUE WHERE id = $1', [id]);
}

module.exports = { create, findById, findByRecipientTg, setRecipientTgMessageId, markRead };
