/**
 * @file Redis-backed per-user message rate limiter. Intended to wrap compose/reply
 * scene submissions (not every update). Call `await checkAndIncrement(ctx)` before
 * accepting an anonymous message; returns true when the sender is over the limit.
 */

'use strict';

const { redis } = require('../../utils/redis');
const { LIMITS } = require('../../utils/constants');

/**
 * @param {number} telegramId
 * @returns {Promise<boolean>} true if rate limited
 */
async function isRateLimited(telegramId) {
  const key = `rl:${telegramId}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, LIMITS.RATE_WINDOW_SEC);
  return n > LIMITS.RATE_MAX_MESSAGES;
}

module.exports = { isRateLimited };
