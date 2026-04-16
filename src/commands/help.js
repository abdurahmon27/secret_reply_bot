/**
 * @file /help command.
 */

'use strict';

const logger = require('../utils/logger');

/** @param {import('telegraf').Telegraf} bot */
function register(bot) {
  bot.help(async (ctx) => {
    try {
      await ctx.reply(ctx.t('help.body'));
    } catch (err) {
      logger.error({ err: err.message, ctx: 'help' });
    }
  });
}

module.exports = { register };
