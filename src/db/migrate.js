/**
 * @file Minimal forward-only SQL migration runner. Reads db/migrations/*.sql in filename
 * order, applies each one inside a transaction, records its filename in _migrations.
 * Safe to run repeatedly — already-applied files are skipped.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { pool, query, tx } = require('./index');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureRegistry() {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Run all pending migration files in filename order.
 * @returns {Promise<number>} count of migrations applied this run
 */
async function runMigrations() {
  await ensureRegistry();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows } = await query('SELECT name FROM _migrations');
  const applied = new Set(rows.map((r) => r.name));

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    logger.info({ ctx: 'migrate', file, status: 'applying' });
    await tx(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO _migrations(name) VALUES ($1)', [file]);
    });
    ran += 1;
    logger.info({ ctx: 'migrate', file, status: 'applied' });
  }
  return ran;
}

if (require.main === module) {
  runMigrations()
    .then((n) => {
      logger.info({ ctx: 'migrate', status: 'done', applied: n });
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err: err.message, ctx: 'migrate' });
      process.exit(1);
    });
}

module.exports = { runMigrations };
