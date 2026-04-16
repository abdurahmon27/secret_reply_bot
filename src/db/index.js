/**
 * @file Postgres connection pool + small query helpers. Only file that instantiates pg.Pool.
 */

'use strict';

const { Pool } = require('pg');
const { env } = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => logger.error({ err: err.message, ctx: 'pg-pool' }));

/**
 * Run a parameterized query.
 * @template T
 * @param {string} text
 * @param {Array<unknown>} [params]
 * @returns {Promise<import('pg').QueryResult<T>>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const ms = Date.now() - start;
    if (ms > 200) logger.warn({ ctx: 'slow-query', ms, text });
    return res;
  } catch (err) {
    logger.error({ err: err.message, ctx: 'pg-query', text });
    throw err;
  }
}

/**
 * Run a function inside a transaction. Automatically commits/rolls back.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };
