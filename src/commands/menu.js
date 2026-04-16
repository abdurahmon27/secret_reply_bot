/**
 * @file /menu command — shows the three-button main menu. Also handles the "Menu"
 * persistent reply-keyboard button.
 */

'use strict';

const { mainMenuKeyboard } = require('../utils/keyboards');
const logger = require('../utils/logger');

/** @param {import('telegraf').Telegraf} bot */
function register(bot) {
  const handler = async (ctx) => {
    try {
      await ctx.reply(ctx.t('menu.title'), mainMenuKeyboard(ctx));
    } catch (err) {
      logger.error({ err: err.message, ctx: 'menu' });
    }
  };
  bot.command('menu', handler);
  bot.hears((text, ctx) => ctx && ctx.t && text === ctx.t('menu.persistent'), handler);
}

module.exports = { register };
