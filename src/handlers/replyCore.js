/**
 * @file Shared anonymous-reply delivery core — invoked by both the `replyScene`
 * (button flow) and the `swipeReply` handler (native swipe gesture). Given the
 * original message row and the replier's freshly-typed content, handle rate-limit,
 * block-check, persistence, threaded delivery, and confirmation in one place.
 */

'use strict';

const users = require('../db/queries/users');
const messages = require('../db/queries/messages');
const blocks = require('../db/queries/blocks');
const { senderHash } = require('../utils/hash');
const { extractContent, deliverCard } = require('../utils/formatters');
const { receiveKeyboard } = require('../utils/keyboards');
const { isRateLimited } = require('../bot/middlewares/rateLimiter');
const logger = require('../utils/logger');

/**
 * Process an anonymous reply — a reply from the recipient of `original` back to
 * whoever sent `original`. Delivers the reply threaded against the original sender's
 * own typed message for native Telegram quote rendering.
 *
 * @param {object} ctx — Telegraf context carrying the replier's message
 * @param {object} original — row from `messages` being replied to
 * @returns {Promise<'ok'|'gone'|'rate_limited'|'blocked'|'unsupported'|'error'>}
 */
async function deliverReply(ctx, original) {
  try {
    // Recipient of the *original* message is the one composing this reply.
    if (String(original.recipient_id) !== String(ctx.user.id)) return 'gone';

    const originalSender = await users.findBySenderHash(original.sender_hash);
    if (!originalSender) return 'gone';

    const payload = extractContent(ctx.message);
    if (!payload) return 'unsupported';

    if (await isRateLimited(ctx.from.id)) return 'rate_limited';

    const myHash = senderHash(ctx.from.id);
    if (await blocks.isBlocked(originalSender.id, myHash)) return 'blocked';

    const replyRow = await messages.create({
      senderHash: myHash,
      recipientId: originalSender.id,
      contentType: payload.type,
      content: payload.content,
      inReplyTo: original.id,
      senderTgMessageId: ctx.message.message_id,
    });

    const deliveredMsgId = await deliverCard(
      ctx.telegram,
      Number(originalSender.telegram_id),
      ctx.t('receive.header_reply'),
      payload,
      {
        reply_markup: receiveKeyboard(ctx, replyRow.id).reply_markup,
        threadToMessageId: original.sender_tg_message_id || undefined,
      },
    );

    await messages.setRecipientTgMessageId(replyRow.id, deliveredMsgId);
    return 'ok';
  } catch (err) {
    logger.error({ err: err.message, ctx: 'reply-core' });
    return 'error';
  }
}

module.exports = { deliverReply };
