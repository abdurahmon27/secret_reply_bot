/**
 * @file Message-card formatters + content serialization for storage/delivery.
 * Keeps the anonymous card layout in one place so it looks identical everywhere.
 */

'use strict';

const { CONTENT_TYPES } = require('./constants');

/**
 * From a Telegraf `ctx.message` object, extract the storable content payload
 * and its type. Returns null if the content type is unsupported.
 *
 * @param {object} message
 * @returns {{type:string, content:object}|null}
 */
function extractContent(message) {
  if (message.text) return { type: CONTENT_TYPES.TEXT, content: { text: message.text } };
  if (message.sticker) return { type: CONTENT_TYPES.STICKER, content: { file_id: message.sticker.file_id } };
  if (message.voice) {
    return {
      type: CONTENT_TYPES.VOICE,
      content: { file_id: message.voice.file_id, caption: message.caption || null },
    };
  }
  if (message.photo && message.photo.length > 0) {
    const best = message.photo[message.photo.length - 1];
    return {
      type: CONTENT_TYPES.PHOTO,
      content: { file_id: best.file_id, caption: message.caption || null },
    };
  }
  return null;
}

/**
 * Deliver an anonymous-message payload to a recipient via Telegraf. Sends the header
 * first, then the content below it quoted via `reply_to_message_id` so the UI renders
 * a native reply layout. If `extra.reply_to_message_id` is supplied, the *header* is
 * threaded against the recipient's original typed message — enabling the "return
 * reply quotes your original message" UX on bidirectional chains.
 *
 * @param {object} telegram — bot.telegram
 * @param {number} chatId — recipient's telegram_id
 * @param {string} header — localized "💌 Anonymous message:" or similar
 * @param {{type:string, content:object}} payload
 * @param {object} [extra] — passed through to the content send (keyboards, parse_mode).
 *                           `extra.threadToMessageId`, if present, threads the *header*
 *                           against that message id in the recipient's chat.
 * @returns {Promise<number>} message_id of the content-card (the swipe-target)
 */
async function deliverCard(telegram, chatId, header, payload, extra = {}) {
  const { threadToMessageId, ...contentExtra } = extra;
  const headerOpts = threadToMessageId
    ? { reply_parameters: { message_id: threadToMessageId, allow_sending_without_reply: true } }
    : {};
  const headerMsg = await telegram.sendMessage(chatId, header, headerOpts);
  const quoteOpts = {
    reply_parameters: { message_id: headerMsg.message_id, allow_sending_without_reply: true },
    ...contentExtra,
  };
  let contentMsg;
  switch (payload.type) {
    case CONTENT_TYPES.TEXT:
      contentMsg = await telegram.sendMessage(chatId, payload.content.text, quoteOpts);
      break;
    case CONTENT_TYPES.PHOTO:
      contentMsg = await telegram.sendPhoto(chatId, payload.content.file_id, {
        ...(payload.content.caption ? { caption: payload.content.caption } : {}),
        ...quoteOpts,
      });
      break;
    case CONTENT_TYPES.VOICE:
      contentMsg = await telegram.sendVoice(chatId, payload.content.file_id, {
        ...(payload.content.caption ? { caption: payload.content.caption } : {}),
        ...quoteOpts,
      });
      break;
    case CONTENT_TYPES.STICKER:
      contentMsg = await telegram.sendSticker(chatId, payload.content.file_id, quoteOpts);
      break;
    default:
      throw new Error(`unknown content type: ${payload.type}`);
  }
  return contentMsg.message_id;
}

module.exports = { extractContent, deliverCard };
