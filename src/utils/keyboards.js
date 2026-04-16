/**
 * @file All inline + reply keyboard builders. Every keyboard used anywhere in the bot
 * is constructed here so button texts flow through i18n and callback data uses constants.
 */

'use strict';

const { Markup } = require('telegraf');
const { t } = require('../i18n');
const { ACTIONS, LIMITS } = require('./constants');
const { buildReferralLink } = require('../config');

const SEP = LIMITS.CALLBACK_SEPARATOR;

/**
 * Pack an action + optional arg into callback data (telegram limit: 64 bytes).
 * @param {string} action
 * @param {string|number} [arg]
 */
function cb(action, arg) {
  return arg != null ? `${action}${SEP}${arg}` : action;
}

/** Parse callback data back into [action, arg]. */
function parseCb(data) {
  const i = data.indexOf(SEP);
  if (i === -1) return [data, null];
  return [data.slice(0, i), data.slice(i + 1)];
}

/**
 * Share + Copy pair shown in welcome + /menu's "My Link" view.
 * @param {object} ctx
 * @param {string} referralCode
 */
function linkShareKeyboard(ctx, referralCode) {
  const link = buildReferralLink(referralCode);
  const prefill = encodeURIComponent(t(ctx, 'share.prefill', { link }));
  return Markup.inlineKeyboard([
    [Markup.button.url(t(ctx, 'buttons.share'), `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${prefill}`)],
    [Markup.button.callback(t(ctx, 'buttons.copy'), cb(ACTIONS.COPY_LINK))],
  ]);
}

/** Received-message card keyboard: Reply / Block. */
function receiveKeyboard(ctx, messageId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t(ctx, 'buttons.reply'), cb(ACTIONS.REPLY, messageId)),
      Markup.button.callback(t(ctx, 'buttons.block'), cb(ACTIONS.BLOCK, messageId)),
    ],
  ]);
}

/** Single Cancel button, used in every scene prompt. */
function cancelKeyboard(ctx) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(ctx, 'buttons.cancel'), cb(ACTIONS.CANCEL))],
  ]);
}

/** Persistent reply keyboard showing just "Menu". */
function menuReplyKeyboard(ctx) {
  return Markup.keyboard([[t(ctx, 'menu.persistent')]]).resize().persistent();
}

/** Main /menu inline keyboard. */
function mainMenuKeyboard(ctx) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(ctx, 'menu.my_link'), cb(ACTIONS.MENU_LINK))],
    [Markup.button.callback(t(ctx, 'menu.settings'), cb(ACTIONS.MENU_SETTINGS))],
    [Markup.button.callback(t(ctx, 'menu.help'), cb(ACTIONS.MENU_HELP))],
  ]);
}

/** Settings language-picker keyboard. */
function languageKeyboard() {
  return Markup.inlineKeyboard([
    [
      { text: '🇺🇿 O\'zbek', callback_data: cb(ACTIONS.LANG, 'uz') },
      { text: '🇷🇺 Русский', callback_data: cb(ACTIONS.LANG, 'ru') },
      { text: '🇬🇧 English', callback_data: cb(ACTIONS.LANG, 'en') },
    ],
  ]);
}

/** Admin menu inline keyboard. */
function adminMenuKeyboard(ctx) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Stats', cb(ACTIONS.ADMIN_STATS))],
    [Markup.button.callback('📣 Broadcast', cb(ACTIONS.ADMIN_BROADCAST))],
  ]);
}

/** Broadcast confirm/cancel. */
function broadcastConfirmKeyboard(ctx) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t(ctx, 'buttons.confirm'), cb(ACTIONS.BROADCAST_CONFIRM)),
      Markup.button.callback(t(ctx, 'buttons.cancel'), cb(ACTIONS.CANCEL)),
    ],
  ]);
}

module.exports = {
  cb,
  parseCb,
  linkShareKeyboard,
  receiveKeyboard,
  cancelKeyboard,
  menuReplyKeyboard,
  mainMenuKeyboard,
  languageKeyboard,
  adminMenuKeyboard,
  broadcastConfirmKeyboard,
};
