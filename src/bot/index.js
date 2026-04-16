/**
 * @file Telegraf composition root. Wires session store → auth → i18n → banGuard →
 * stage (scenes) → commands → callback-query router → message fallback. No business
 * logic lives here.
 */

'use strict';

const { Telegraf, session, Scenes } = require('telegraf');
const { env } = require('../config');
const { sessionStore } = require('../utils/redis');
const auth = require('./middlewares/auth');
const i18nLoader = require('./middlewares/i18nLoader');
const banGuard = require('./middlewares/banGuard');

const composeScene = require('./scenes/composeScene');
const replyScene = require('./scenes/replyScene');
const broadcastScene = require('./scenes/broadcastScene');

const startCmd = require('../commands/start');
const menuCmd = require('../commands/menu');
const helpCmd = require('../commands/help');
const adminCmd = require('../commands/admin');
const callbackQuery = require('../handlers/callbackQuery');
const swipeReply = require('../handlers/swipeReply');
const messageFallback = require('../handlers/message');
const logger = require('../utils/logger');

/**
 * Build and return the fully-wired Telegraf bot.
 * @returns {import('telegraf').Telegraf}
 */
function buildBot() {
  const bot = new Telegraf(env.BOT_TOKEN, { handlerTimeout: 30_000 });

  bot.catch((err, ctx) => {
    logger.error({ err: err.message, ctx: 'telegraf-catch', update_type: ctx && ctx.updateType });
  });

  bot.use(session({ store: sessionStore }));
  bot.use(auth());
  bot.use(i18nLoader());
  bot.use(banGuard());

  const stage = new Scenes.Stage([composeScene, replyScene, broadcastScene]);
  bot.use(stage.middleware());

  // Commands (registered before generic callback/message handlers so they win).
  startCmd.register(bot);
  menuCmd.register(bot);
  helpCmd.register(bot);
  adminCmd.register(bot);

  // Inline-button router.
  callbackQuery.register(bot);

  // Native swipe-reply shortcut (must come before menu fallback).
  swipeReply.register(bot);

  // Final fallback.
  messageFallback.register(bot);

  return bot;
}

module.exports = { buildBot };
