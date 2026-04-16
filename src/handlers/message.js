/**
 * @file Non-scene message fallback. Anything that wasn't handled by /start, /menu, /help,
 * /admin, a scene, or a callback query hits this last. Default behavior: nudge to /menu.
 */

'use strict';

const { mainMenuKeyboard } = require('../utils/keyboards');
const logger = require('../utils/logger');

/** @param {import('telegraf').Telegraf} bot */
function register(bot) {
  bot.on('message', async (ctx) => {
    try {
      await ctx.reply(ctx.t('menu.title'), mainMenuKeyboard(ctx));
    } catch (err) {
      logger.error({ err: err.message, ctx: 'message-fallback' });
    }
  });
}

module.exports = { register };
