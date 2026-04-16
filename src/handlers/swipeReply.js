/**
 * @file Swipe-reply handler — when a user uses Telegram's native swipe-to-reply
 * gesture on an anonymous card, treat it as an anonymous reply without routing
 * through the reply scene (no "write your reply" prompt — they already typed).
 *
 * Registered after the stage middleware (so in-scene flows still win) but before
 * the menu fallback, so any non-card swipe-reply falls through naturally.
 */

'use strict';

const messages = require('../db/queries/messages');
const { deliverReply } = require('./replyCore');
const logger = require('../utils/logger');

/** @param {import('telegraf').Telegraf} bot */
function register(bot) {
  bot.on('message', async (ctx, next) => {
    try {
      const replyTo = ctx.message && ctx.message.reply_to_message;
      if (!replyTo || !ctx.user) return next();

      const original = await messages.findByRecipientTg(ctx.user.id, replyTo.message_id);
      if (!original) return next();

      const result = await deliverReply(ctx, original);
      const replyKey = {
        ok: 'reply.delivered',
        gone: 'reply.gone',
        rate_limited: 'compose.rate_limited',
        blocked: 'compose.failed',
        unsupported: 'compose.unsupported',
        error: 'errors.generic',
      }[result];
      await ctx.reply(ctx.t(replyKey));
    } catch (err) {
      logger.error({ err: err.message, ctx: 'swipe-reply' });
      await ctx.reply(ctx.t('errors.generic')).catch(() => {});
    }
  });
}

module.exports = { register };
