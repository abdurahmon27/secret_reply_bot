/**
 * @file Centralized constants — scene IDs, callback action names, content types, limits.
 * No magic strings may appear outside this file.
 */

'use strict';

const SCENES = Object.freeze({
  COMPOSE: 'compose',
  REPLY: 'reply',
  SETTINGS: 'settings',
  BROADCAST: 'broadcast',
});

const ACTIONS = Object.freeze({
  SHARE_LINK: 'share_link',
  COPY_LINK: 'copy_link',
  REPLY: 'reply',
  BLOCK: 'block',
  MENU_LINK: 'menu_link',
  MENU_SETTINGS: 'menu_settings',
  MENU_HELP: 'menu_help',
  MENU_BACK: 'menu_back',
  LANG: 'lang',
  CANCEL: 'cancel',
  CONFIRM: 'confirm',
  ADMIN_STATS: 'admin_stats',
  ADMIN_BROADCAST: 'admin_broadcast',
  BROADCAST_CONFIRM: 'broadcast_confirm',
});

const CONTENT_TYPES = Object.freeze({
  TEXT: 'text',
  PHOTO: 'photo',
  VOICE: 'voice',
  STICKER: 'sticker',
});

const LANGUAGES = Object.freeze(['uz', 'ru', 'en']);
const DEFAULT_LANGUAGE = 'en';

const LIMITS = Object.freeze({
  RATE_WINDOW_SEC: 60,
  RATE_MAX_MESSAGES: 10,
  BROADCAST_MSG_PER_SEC: 30,
  REFERRAL_CODE_LEN: 8,
  REFERRAL_PREFIX: 'ref_',
  CALLBACK_SEPARATOR: ':',
});

module.exports = {
  SCENES,
  ACTIONS,
  CONTENT_TYPES,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  LIMITS,
};
