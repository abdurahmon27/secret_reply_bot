/**
 * @file Broadcast scene (admins only). Three steps:
 *   1. enter → prompt for the broadcast message
 *   2. first message → echo preview + Confirm/Cancel
 *   3. Confirm → throttled fan-out to all active users, report success/fail counts
 */

'use strict';

const { Scenes } = require('telegraf');
const users = require('../../db/queries/users');
const { cancelKeyboard, broadcastConfirmKeyboard } = require('../../utils/keyboards');
const { extractContent } = require('../../utils/formatters');
const { SCENES, LIMITS, ACTIONS, CONTENT_TYPES } = require('../../utils/constants');
const logger = require('../../utils/logger');

const broadcastScene = new Scenes.BaseScene(SCENES.BROADCAST);

broadcastScene.enter(async (ctx) => {
  ctx.scene.state.stage = 'collect';
  await ctx.reply(ctx.t('admin.broadcast_prompt'), cancelKeyboard(ctx));
});

broadcastScene.on('message', async (ctx) => {
  try {
    if (ctx.message.text && ctx.message.text.startsWith('/')) {
      await ctx.scene.leave();
      return;
    }
    const stage = ctx.scene.state.stage || 'collect';
    if (stage === 'collect') {
      const payload = extractContent(ctx.message);
      if (!payload) {
        await ctx.reply(ctx.t('compose.unsupported'), cancelKeyboard(ctx));
        return;
      }
      ctx.scene.state.payload = payload;
      ctx.scene.state.stage = 'confirm';
      const recipients = await users.allActiveForBroadcast();
      ctx.scene.state.recipients = recipients;
      // echo preview using the original message
      await ctx.copyMessage(ctx.chat.id);
      await ctx.reply(
        ctx.t('admin.broadcast_preview', { count: recipients.length }),
        broadcastConfirmKeyboard(ctx),
      );
      return;
    }
    // Anything else during confirm stage: ignore
  } catch (err) {
    logger.error({ err: err.message, ctx: 'broadcast-collect' });
    await ctx.reply(ctx.t('errors.generic')).catch(() => {});
    return ctx.scene.leave();
  }
});

broadcastScene.action(ACTIONS.BROADCAST_CONFIRM, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    if (ctx.scene.state.stage !== 'confirm' || !ctx.scene.state.payload) {
      await ctx.scene.leave();
      return;
    }
    const { payload, recipients } = ctx.scene.state;
    await ctx.reply(ctx.t('admin.broadcast_sending', { count: recipients.length }));

    const result = await fanOut(ctx.telegram, recipients, payload);
    await ctx.reply(ctx.t('admin.broadcast_done', { sent: result.sent, failed: result.failed }));
    return ctx.scene.leave();
  } catch (err) {
    logger.error({ err: err.message, ctx: 'broadcast-confirm' });
    await ctx.reply(ctx.t('errors.generic')).catch(() => {});
    return ctx.scene.leave();
  }
});

broadcastScene.action('cancel', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply(ctx.t('admin.broadcast_cancelled'));
  } catch (_) {}
  return ctx.scene.leave();
});

/**
 * Throttled fan-out — max 30 msg/s via a 1000/30 ms window pacer.
 * @param {object} telegram
 * @param {Array<{telegram_id:number, language:string}>} recipients
 * @param {{type:string, content:object}} payload
 */
async function fanOut(telegram, recipients, payload) {
  const intervalMs = Math.ceil(1000 / LIMITS.BROADCAST_MSG_PER_SEC);
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      await sendOne(telegram, Number(r.telegram_id), payload);
      sent += 1;
    } catch (err) {
      failed += 1;
      logger.warn({ ctx: 'broadcast-send', to: r.telegram_id, err: err.message });
    }
    await sleep(intervalMs);
  }
  return { sent, failed };
}

function sendOne(telegram, chatId, payload) {
  switch (payload.type) {
    case CONTENT_TYPES.TEXT:
      return telegram.sendMessage(chatId, payload.content.text);
    case CONTENT_TYPES.PHOTO:
      return telegram.sendPhoto(chatId, payload.content.file_id, payload.content.caption ? { caption: payload.content.caption } : {});
    case CONTENT_TYPES.VOICE:
      return telegram.sendVoice(chatId, payload.content.file_id, payload.content.caption ? { caption: payload.content.caption } : {});
    case CONTENT_TYPES.STICKER:
      return telegram.sendSticker(chatId, payload.content.file_id);
    default:
      return Promise.reject(new Error('unsupported'));
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = broadcastScene;
