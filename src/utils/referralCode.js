/**
 * @file Referral-code generation and parsing. Format: `ref_<8-char-lowercase-alphanumeric>`.
 */

'use strict';

const { customAlphabet } = require('nanoid');
const { LIMITS } = require('./constants');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(ALPHABET, LIMITS.REFERRAL_CODE_LEN);

/**
 * Generate a new referral code like "ref_3f8k2m1q".
 * @returns {string}
 */
function generateReferralCode() {
  return LIMITS.REFERRAL_PREFIX + nano();
}

/**
 * If the /start payload is a ref code, return it; otherwise null.
 * @param {string|undefined} payload
 * @returns {string|null}
 */
function parseStartPayload(payload) {
  if (!payload) return null;
  const trimmed = payload.trim();
  if (!trimmed.startsWith(LIMITS.REFERRAL_PREFIX)) return null;
  const rest = trimmed.slice(LIMITS.REFERRAL_PREFIX.length);
  if (rest.length !== LIMITS.REFERRAL_CODE_LEN) return null;
  if (!/^[0-9a-z]+$/.test(rest)) return null;
  return trimmed;
}

module.exports = { generateReferralCode, parseStartPayload };
