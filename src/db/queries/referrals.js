/**
 * @file Referrals table queries.
 */

'use strict';

const { query } = require('../index');

/**
 * Insert a referral relationship. Idempotent via UNIQUE constraint.
 * Skips self-referrals.
 * @param {number} referrerId
 * @param {number} refereeId
 */
async function record(referrerId, refereeId) {
  if (referrerId === refereeId) return;
  await query(
    `INSERT INTO referrals (referrer_id, referee_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [referrerId, refereeId],
  );
}

/** @param {number} userId */
async function countByReferrer(userId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS n FROM referrals WHERE referrer_id = $1',
    [userId],
  );
  return rows[0].n;
}

module.exports = { record, countByReferrer };
