/**
 * @file Users table queries. Upsert on first contact, language/ban updates, lookups by
 * telegram_id / referral_code / sender_hash.
 */

'use strict';

const { query } = require('../index');
const { senderHash } = require('../../utils/hash');
const { generateReferralCode } = require('../../utils/referralCode');
const { DEFAULT_LANGUAGE, LANGUAGES } = require('../../utils/constants');

/**
 * Upsert the user identified by the Telegraf `from` object. Inserts with a fresh
 * referral_code + sender_hash on first contact; on subsequent calls refreshes
 * first_name / username / last_active but preserves language preference and referral_code.
 *
 * @param {{id:number, first_name?:string, username?:string, language_code?:string}} from
 * @returns {Promise<{user: object, isNew: boolean}>}
 */
async function upsertFromTelegram(from) {
  const detected = detectLanguage(from.language_code);
  const code = generateReferralCode();
  const sh = senderHash(from.id);
  const { rows } = await query(
    `
    INSERT INTO users (telegram_id, first_name, username, language, referral_code, sender_hash)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (telegram_id) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          username   = EXCLUDED.username,
          last_active = NOW()
    RETURNING *, (xmax = 0) AS is_new
    `,
    [from.id, from.first_name || null, from.username || null, detected, code, sh],
  );
  const row = rows[0];
  const { is_new: isNew, ...user } = row;
  return { user, isNew };
}

/** @param {string|undefined} code */
function detectLanguage(code) {
  if (!code) return DEFAULT_LANGUAGE;
  const base = code.split('-')[0].toLowerCase();
  return LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

/** @param {number} telegramId */
async function findByTelegramId(telegramId) {
  const { rows } = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0] || null;
}

/** @param {number} id */
async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

/** @param {string} referralCode */
async function findByReferralCode(referralCode) {
  const { rows } = await query('SELECT * FROM users WHERE referral_code = $1', [referralCode]);
  return rows[0] || null;
}

/** @param {string} hash */
async function findBySenderHash(hash) {
  const { rows } = await query('SELECT * FROM users WHERE sender_hash = $1', [hash]);
  return rows[0] || null;
}

/** @param {number} userId @param {string} language */
async function updateLanguage(userId, language) {
  if (!LANGUAGES.includes(language)) throw new Error('invalid language');
  await query('UPDATE users SET language = $1 WHERE id = $2', [language, userId]);
}

/** @param {number} userId */
async function touchLastActive(userId) {
  await query('UPDATE users SET last_active = NOW() WHERE id = $1', [userId]);
}

/** @param {number} userId @param {number|null} referrerId */
async function setReferredBy(userId, referrerId) {
  await query(
    'UPDATE users SET referred_by = $1 WHERE id = $2 AND referred_by IS NULL',
    [referrerId, userId],
  );
}

/** @param {number} telegramId @param {boolean} isBanned */
async function setBanned(telegramId, isBanned) {
  const { rowCount } = await query(
    'UPDATE users SET is_banned = $1 WHERE telegram_id = $2',
    [isBanned, telegramId],
  );
  return rowCount > 0;
}

/**
 * Aggregate counts for /stats.
 * @returns {Promise<{total:number, active7d:number, messages:number, referrals:number}>}
 */
async function stats() {
  const { rows } = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total,
      (SELECT COUNT(*)::int FROM users WHERE last_active > NOW() - INTERVAL '7 days') AS active7d,
      (SELECT COUNT(*)::int FROM messages) AS messages,
      (SELECT COUNT(*)::int FROM referrals) AS referrals
  `);
  return rows[0];
}

/** @returns {Promise<Array<{telegram_id:number, language:string}>>} */
async function allActiveForBroadcast() {
  const { rows } = await query(
    'SELECT telegram_id, language FROM users WHERE is_banned = FALSE',
  );
  return rows;
}

/** @param {number} telegramId */
async function userInfo(telegramId) {
  const { rows } = await query(
    `
    SELECT u.*,
      (SELECT COUNT(*)::int FROM referrals r WHERE r.referrer_id = u.id) AS referral_count,
      (SELECT COUNT(*)::int FROM messages m WHERE m.recipient_id = u.id) AS messages_received
    FROM users u WHERE u.telegram_id = $1
    `,
    [telegramId],
  );
  return rows[0] || null;
}

module.exports = {
  upsertFromTelegram,
  detectLanguage,
  findByTelegramId,
  findById,
  findByReferralCode,
  findBySenderHash,
  updateLanguage,
  touchLastActive,
  setReferredBy,
  setBanned,
  stats,
  allActiveForBroadcast,
  userInfo,
};
