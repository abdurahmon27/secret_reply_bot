/**
 * @file Reply scene — recipient anonymously replies to an incoming message via the
 * `💬 Reply` inline button. Entered with scene state `{messageId}`. Delegates
 * delivery to `replyCore.deliverReply()` so this flow stays in lock-step with the
 * swipe-reply handler.
 */

'use strict';

const { Scenes } = require('telegraf');
const messages = require('../../db/queries/messages');
const { cancelKeyboard } = require('../../utils/keyboards');
const { deliverReply } = require('../../handlers/replyCore');
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

    const result = await deliverReply(ctx, original);
    const replyKey = {
      ok: 'reply.delivered',
      gone: 'reply.gone',
      rate_limited: 'compose.rate_limited',
      blocked: 'compose.failed',
      unsupported: 'compose.unsupported',
      error: 'errors.generic',
    }[result];

    if (result === 'unsupported') {
      await ctx.reply(ctx.t(replyKey), cancelKeyboard(ctx));
      return; // stay in scene so they can retry with a valid content type
    }
    await ctx.reply(ctx.t(replyKey));
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
