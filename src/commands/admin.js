/**
 * @file Admin commands — /admin menu, /stats, /broadcast, /ban, /unban, /userinfo.
 * Every handler is wrapped by adminGuard so non-admins never see or trigger them.
 */

'use strict';

const adminGuard = require('../bot/middlewares/adminGuard');
const users = require('../db/queries/users');
const { adminMenuKeyboard } = require('../utils/keyboards');
const { SCENES } = require('../utils/constants');
const logger = require('../utils/logger');

/** @param {import('telegraf').Telegraf} bot */
function register(bot) {
  bot.command('admin', adminGuard(), async (ctx) => {
    await ctx.reply(ctx.t('admin.menu'), adminMenuKeyboard(ctx)).catch((err) =>
      logger.error({ err: err.message, ctx: 'admin-menu' }),
    );
  });

  bot.command('stats', adminGuard(), async (ctx) => {
    try {
      const s = await users.stats();
      await ctx.reply(ctx.t('admin.stats', s));
    } catch (err) {
      logger.error({ err: err.message, ctx: 'admin-stats' });
    }
  });

  bot.command('broadcast', adminGuard(), async (ctx) => {
    await ctx.scene.enter(SCENES.BROADCAST).catch((err) =>
      logger.error({ err: err.message, ctx: 'admin-broadcast-enter' }),
    );
  });

  bot.command('ban', adminGuard(), async (ctx) => {
    try {
      const arg = (ctx.message.text.split(/\s+/)[1] || '').trim();
      const id = Number(arg);
      if (!Number.isFinite(id) || id <= 0) {
        await ctx.reply(ctx.t('admin.ban_usage'));
        return;
      }
      const ok = await users.setBanned(id, true);
      await ctx.reply(ok ? ctx.t('admin.ban_done', { id }) : ctx.t('admin.ban_not_found', { id }));
    } catch (err) {
      logger.error({ err: err.message, ctx: 'admin-ban' });
    }
  });

  bot.command('unban', adminGuard(), async (ctx) => {
    try {
      const arg = (ctx.message.text.split(/\s+/)[1] || '').trim();
      const id = Number(arg);
      if (!Number.isFinite(id) || id <= 0) {
        await ctx.reply(ctx.t('admin.unban_usage'));
        return;
      }
      const ok = await users.setBanned(id, false);
      await ctx.reply(ok ? ctx.t('admin.unban_done', { id }) : ctx.t('admin.ban_not_found', { id }));
    } catch (err) {
      logger.error({ err: err.message, ctx: 'admin-unban' });
    }
  });

  bot.command('userinfo', adminGuard(), async (ctx) => {
    try {
      const arg = (ctx.message.text.split(/\s+/)[1] || '').trim();
      const id = Number(arg);
      if (!Number.isFinite(id) || id <= 0) {
        await ctx.reply(ctx.t('admin.userinfo_usage'));
        return;
      }
      const info = await users.userInfo(id);
      if (!info) {
        await ctx.reply(ctx.t('admin.ban_not_found', { id }));
        return;
      }
      await ctx.reply(
        ctx.t('admin.userinfo', {
          id: info.telegram_id,
          name: info.first_name || '-',
          username: info.username || '-',
          language: info.language,
          created_at: new Date(info.created_at).toISOString(),
          last_active: new Date(info.last_active).toISOString(),
          referrals: info.referral_count,
          messages: info.messages_received,
          banned: info.is_banned ? 'yes' : 'no',
        }),
      );
    } catch (err) {
      logger.error({ err: err.message, ctx: 'admin-userinfo' });
    }
  });
}

module.exports = { register };
