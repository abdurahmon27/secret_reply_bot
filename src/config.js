/**
 * @file Zod-validated environment configuration.
 * Loaded exactly once at process start. Fails loudly if any required var is missing or malformed.
 */

'use strict';

require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  BOT_TOKEN: z.string().min(10, 'BOT_TOKEN is required'),
  ADMIN_IDS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => {
          const n = Number(v);
          if (!Number.isInteger(n)) throw new Error(`Invalid ADMIN_ID: ${v}`);
          return n;
        }),
    ),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  HMAC_SECRET: z.string().min(16, 'HMAC_SECRET must be at least 16 chars'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  process.stderr.write(`\nInvalid environment configuration:\n${issues}\n\n`);
  process.exit(1);
}

const env = parsed.data;
const isProd = env.NODE_ENV === 'production';

/** Bot username cache — set once at boot via setBotUsername(). */
let botUsername = null;

/**
 * Cache the bot username (fetched once at boot via Telegraf getMe()).
 * @param {string} username
 */
function setBotUsername(username) {
  botUsername = username;
}

/** @returns {string} */
function getBotUsername() {
  if (!botUsername) throw new Error('Bot username not initialized');
  return botUsername;
}

/**
 * Build a `t.me/<bot>?start=ref_XXXX` link.
 * @param {string} referralCode
 * @returns {string}
 */
function buildReferralLink(referralCode) {
  return `https://t.me/${getBotUsername()}?start=${referralCode}`;
}

module.exports = {
  env,
  isProd,
  logLevel: env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  setBotUsername,
  getBotUsername,
  buildReferralLink,
  adminIds: env.ADMIN_IDS,
};
