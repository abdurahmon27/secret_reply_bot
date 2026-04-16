/**
 * @file Callback-query router — dispatches every inline-button press to the right
 * handler based on the `action` prefix. Callback data format: `action[:arg]`.
 */

'use strict';

const users = require('../db/queries/users');
const messages = require('../db/queries/messages');
const blocks = require('../db/queries/blocks');
const { parseCb } = require('../utils/keyboards');
const {
  ACTIONS,
  SCENES,
  LIMITS,
  LANGUAGES,
} = require('../utils/constants');
const {
  linkShareKeyboard,
  mainMenuKeyboard,
  languageKeyboard,
  adminMenuKeyboard,
} = require('../utils/keyboards');
const { buildReferralLink } = require('../config');
const { isAdmin } = require('../bot/middlewares/adminGuard');
const logger = require('../utils/logger');

/** @param {import('telegraf').Telegraf} bot */
function register(bot) {
  bot.on('callback_query', async (ctx, next) => {
    const data = ctx.callbackQuery && ctx.callbackQuery.data;
    if (!data) return next();
    const [action, arg] = parseCb(data);

    try {
      switch (action) {
        case ACTIONS.COPY_LINK:
          await ctx.answerCbQuery();
          await ctx.reply(buildReferralLink(ctx.user.referral_code));
          return;

        case ACTIONS.REPLY: {
          await ctx.answerCbQuery();
          const id = Number(arg);
          if (!Number.isFinite(id)) return;
          const msg = await messages.findById(id);
          if (!msg || String(msg.recipient_id) !== String(ctx.user.id)) {
            await ctx.reply(ctx.t('reply.gone'));
            return;
          }
          await ctx.scene.enter(SCENES.REPLY, { messageId: id });
          return;
        }

        case ACTIONS.BLOCK: {
          const id = Number(arg);
          if (!Number.isFinite(id)) {
            await ctx.answerCbQuery();
            return;
          }
          const msg = await messages.findById(id);
          if (!msg || String(msg.recipient_id) !== String(ctx.user.id)) {
            await ctx.answerCbQuery();
            return;
          }
          await blocks.block(ctx.user.id, msg.sender_hash);
          await ctx.answerCbQuery(ctx.t('block.confirmed'));
          await ctx.reply(ctx.t('block.confirmed'));
          return;
        }

        case ACTIONS.MENU_LINK:
          await ctx.answerCbQuery();
          await ctx.reply(
            ctx.t('start.link_only', {
              name: ctx.user.first_name || '',
              link: buildReferralLink(ctx.user.referral_code),
            }),
            linkShareKeyboard(ctx, ctx.user.referral_code),
          );
          return;

        case ACTIONS.MENU_SETTINGS:
          await ctx.answerCbQuery();
          await ctx.reply(ctx.t('settings.title'), languageKeyboard());
          return;

        case ACTIONS.MENU_HELP:
          await ctx.answerCbQuery();
          await ctx.reply(ctx.t('help.body'));
          return;

        case ACTIONS.LANG: {
          if (!LANGUAGES.includes(arg)) {
            await ctx.answerCbQuery();
            return;
          }
          await users.updateLanguage(ctx.user.id, arg);
          ctx.user.language = arg;
          await ctx.answerCbQuery();
          await ctx.reply(ctx.t('settings.changed'));
          await ctx.reply(ctx.t('menu.title'), mainMenuKeyboard(ctx));
          return;
        }

        case ACTIONS.CANCEL:
          await ctx.answerCbQuery();
          if (ctx.scene && ctx.scene.current) await ctx.scene.leave();
          return;

        case ACTIONS.ADMIN_STATS: {
          if (!isAdmin(ctx.from.id)) {
            await ctx.answerCbQuery(ctx.t('admin.not_admin'));
            return;
          }
          await ctx.answerCbQuery();
          const s = await users.stats();
          await ctx.reply(ctx.t('admin.stats', s));
          return;
        }

        case ACTIONS.ADMIN_BROADCAST: {
          if (!isAdmin(ctx.from.id)) {
            await ctx.answerCbQuery(ctx.t('admin.not_admin'));
            return;
          }
          await ctx.answerCbQuery();
          await ctx.scene.enter(SCENES.BROADCAST);
          return;
        }

        default:
          // Unrecognized — let scenes handle their own actions via scene.action().
          return next();
      }
    } catch (err) {
      logger.error({ err: err.message, ctx: 'callback-query', data });
      try { await ctx.answerCbQuery(ctx.t('errors.generic')); } catch (_) {}
    }
  });
}

module.exports = { register };
