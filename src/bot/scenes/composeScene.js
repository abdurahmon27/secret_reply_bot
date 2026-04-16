/**
 * @file Compose scene — visitor writing one anonymous message to a recipient.
 * Entered with scene state `{recipientId, recipientName}`. Accepts text/photo/voice/sticker.
 * On submit: rate-limit check → block check → persist → deliver card → leave.
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

const composeScene = new Scenes.BaseScene(SCENES.COMPOSE);

composeScene.enter(async (ctx) => {
  const { recipientName } = ctx.scene.state || {};
  if (!ctx.scene.state || !ctx.scene.state.recipientId) {
    await ctx.reply(ctx.t('errors.generic'));
    return ctx.scene.leave();
  }
  await ctx.reply(ctx.t('compose.prompt', { name: recipientName || '' }), cancelKeyboard(ctx));
});

composeScene.on('message', async (ctx) => {
  try {
    if (ctx.message.text && ctx.message.text.startsWith('/')) {
      await ctx.scene.leave();
      return;
    }
    const { recipientId } = ctx.scene.state;
    const recipient = await users.findById(recipientId);
    if (!recipient) {
      await ctx.reply(ctx.t('compose.failed'));
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

    const hash = senderHash(ctx.from.id);
    if (await blocks.isBlocked(recipient.id, hash)) {
      await ctx.reply(ctx.t('compose.failed'));
      return ctx.scene.leave();
    }

    const msg = await messages.create({
      senderHash: hash,
      recipientId: recipient.id,
      contentType: payload.type,
      content: payload.content,
    });

    try {
      await deliverCard(
        ctx.telegram,
        Number(recipient.telegram_id),
        ctx.t('receive.header'),
        payload,
        { reply_markup: receiveKeyboard(ctx, msg.id).reply_markup },
      );
    } catch (sendErr) {
      logger.error({ err: sendErr.message, ctx: 'compose-deliver', recipient: recipient.id });
      await ctx.reply(ctx.t('compose.failed'));
      return ctx.scene.leave();
    }

    await ctx.reply(ctx.t('compose.delivered'));
    return ctx.scene.leave();
  } catch (err) {
    logger.error({ err: err.message, ctx: 'compose-scene' });
    await ctx.reply(ctx.t('errors.generic')).catch(() => {});
    return ctx.scene.leave();
  }
});

composeScene.action('cancel', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply(ctx.t('compose.cancelled'));
  } catch (_) {}
  return ctx.scene.leave();
});

module.exports = composeScene;
