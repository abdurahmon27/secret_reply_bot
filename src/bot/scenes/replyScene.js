/**
 * @file Reply scene — recipient anonymously replies to an incoming message. Entered
 * with scene state `{messageId}`. We look up the message, resolve sender_hash → user,
 * deliver the reply with the "↩️ They replied" header, leave.
 */

'use strict';

const { Scenes } = require('telegraf');
const users = require('../../db/queries/users');
const messages = require('../../db/queries/messages');
const blocks = require('../../db/queries/blocks');
const { senderHash } = require('../../utils/hash');
const { extractContent, deliverCard } = require('../../utils/formatters');
const { receiveKeyboard, cancelKeyboard } = require('../../utils/keyboards');
const { isRateLimited } = require('../middlewares/rateLimiter');
const { SCENES } = require('../../utils/constants');
const logger = require('../../utils/logger');

const replyScene = new Scenes.BaseScene(SCENES.REPLY);

replyScene.enter(async (ctx) => {
  if (!ctx.scene.state || !ctx.scene.state.messageId) {
    await ctx.reply(ctx.t('errors.generic'));
    return ctx.scene.leave();
  }
  await ctx.reply(ctx.t('reply.prompt'), cancelKeyboard(ctx));
});

replyScene.on('message', async (ctx) => {
  try {
    if (ctx.message.text && ctx.message.text.startsWith('/')) {
      await ctx.scene.leave();
      return;
    }
    const { messageId } = ctx.scene.state;
    const original = await messages.findById(messageId);
    if (!original) {
      await ctx.reply(ctx.t('reply.gone'));
      return ctx.scene.leave();
    }

    // The *replier* is the recipient of the original message — confirm identity.
    if (String(original.recipient_id) !== String(ctx.user.id)) {
      await ctx.reply(ctx.t('reply.gone'));
      return ctx.scene.leave();
    }

    const originalSender = await users.findBySenderHash(original.sender_hash);
    if (!originalSender) {
      await ctx.reply(ctx.t('reply.gone'));
      return ctx.scene.leave();
    }

    const payload = extractContent(ctx.message);
    if (!payload) {
      await ctx.reply(ctx.t('compose.unsupported'), cancelKeyboard(ctx));
      return;
    }

    if (await isRateLimited(ctx.from.id)) {
      await ctx.reply(ctx.t('compose.rate_limited'));
      return ctx.scene.leave();
    }

    // A reply is itself an anonymous message *from* the recipient *to* the original sender.
    const myHash = senderHash(ctx.from.id);
    if (await blocks.isBlocked(originalSender.id, myHash)) {
      await ctx.reply(ctx.t('compose.failed'));
      return ctx.scene.leave();
    }

    const replyMsg = await messages.create({
      senderHash: myHash,
      recipientId: originalSender.id,
      contentType: payload.type,
      content: payload.content,
      inReplyTo: original.id,
    });

    try {
      await deliverCard(
        ctx.telegram,
        Number(originalSender.telegram_id),
        ctx.t('receive.header_reply'),
        payload,
        { reply_markup: receiveKeyboard(ctx, replyMsg.id).reply_markup },
      );
    } catch (err) {
      logger.error({ err: err.message, ctx: 'reply-deliver' });
      await ctx.reply(ctx.t('compose.failed'));
      return ctx.scene.leave();
    }

    await ctx.reply(ctx.t('reply.delivered'));
    return ctx.scene.leave();
  } catch (err) {
    logger.error({ err: err.message, ctx: 'reply-scene' });
    await ctx.reply(ctx.t('errors.generic')).catch(() => {});
    return ctx.scene.leave();
  }
});

replyScene.action('cancel', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply(ctx.t('reply.cancelled'));
  } catch (_) {}
  return ctx.scene.leave();
});

module.exports = replyScene;
