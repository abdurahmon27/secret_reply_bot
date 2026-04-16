/**
 * @file Redis client + Telegraf session store. One shared ioredis connection.
 */

'use strict';

const Redis = require('ioredis');
const { env } = require('../config');
const logger = require('./logger');

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: false,
  enableReadyCheck: true,
});

redis.on('error', (err) => logger.error({ err: err.message, ctx: 'redis' }));
redis.on('connect', () => logger.info('Redis connected'));

const SESSION_PREFIX = 'session:';
const SESSION_TTL_SEC = 60 * 60 * 24;

/**
 * Telegraf session store (Telegraf v4 store-interface compliant).
 */
const sessionStore = {
  async get(key) {
    const raw = await redis.get(SESSION_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  },
  async set(key, value) {
    await redis.set(SESSION_PREFIX + key, JSON.stringify(value), 'EX', SESSION_TTL_SEC);
  },
  async delete(key) {
    await redis.del(SESSION_PREFIX + key);
  },
};

module.exports = { redis, sessionStore };
