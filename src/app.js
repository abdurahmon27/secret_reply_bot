/**
 * @file Entry point. Loads config, runs pending DB migrations, caches the bot
 * username, launches the bot, and handles graceful shutdown on SIGTERM/SIGINT.
 */

'use strict';

const { buildBot } = require('./bot');
const { setBotUsername } = require('./config');
const { pool } = require('./db');
const { redis } = require('./utils/redis');
const { runMigrations } = require('./db/migrate');
const logger = require('./utils/logger');

async function main() {
  const applied = await runMigrations();
  logger.info({ ctx: 'startup', migrations_applied: applied });

  const bot = buildBot();
  const me = await bot.telegram.getMe();
  setBotUsername(me.username);
  logger.info({ ctx: 'startup', bot: me.username, id: me.id });

  await bot.launch({ dropPendingUpdates: true });
  logger.info({ ctx: 'startup', status: 'running' });

  const shutdown = async (signal) => {
    logger.info({ ctx: 'shutdown', signal });
    try { bot.stop(signal); } catch (_) {}
    await Promise.allSettled([pool.end(), redis.quit()]);
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err: err.message, stack: err.stack, ctx: 'fatal' });
  process.exit(1);
});
