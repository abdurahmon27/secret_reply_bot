/**
 * @file /start command handler — welcome new users, show link for returning, and
 * transparently enter composeScene when arriving via a `ref_XXXX` deep link.
 */

'use strict';

const users = require('../db/queries/users');
const referrals = require('../db/queries/referrals');
const { parseStartPayload } = require('../utils/referralCode');
const { buildReferralLink } = require('../config');
const { linkShareKeyboard, menuReplyKeyboard } = require('../utils/keyboards');
const { SCENES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Register the /start command on the bot instance.
 * @param {import('telegraf').Telegraf} bot
 */
function register(bot) {
  bot.start(async (ctx) => {
    try {
      const rawPayload = (ctx.startPayload || '').trim();
      const refCode = parseStartPayload(rawPayload);

      if (refCode) {
        const recipient = await users.findByReferralCode(refCode);
        if (!recipient) {
          await sendWelcome(ctx);
          return;
        }
        if (recipient.id === ctx.user.id) {
          const link = buildReferralLink(ctx.user.referral_code);
          await ctx.reply(
            ctx.t('start.self_referral') + '\n\n' + ctx.t('start.link_only', { name: ctx.user.first_name || '', link }),
            linkShareKeyboard(ctx, ctx.user.referral_code),
          );
          return;
        }
        if (ctx.userIsNew) {
          await users.setReferredBy(ctx.user.id, recipient.id);
          await referrals.record(recipient.id, ctx.user.id);
        }
        await ctx.scene.enter(SCENES.COMPOSE, {
          recipientId: recipient.id,
          recipientName: recipient.first_name || '',
        });
        return;
      }

      await sendWelcome(ctx);
    } catch (err) {
      logger.error({ err: err.message, ctx: 'start-handler' });
      await ctx.reply(ctx.t('errors.generic')).catch(() => {});
    }
  });
}

/** @param {object} ctx */
async function sendWelcome(ctx) {
  const link = buildReferralLink(ctx.user.referral_code);
  const key = ctx.userIsNew ? 'start.welcome_new' : 'start.link_only';
  await ctx.reply(
    ctx.t(key, { name: ctx.user.first_name || '', link }),
    {
      ...linkShareKeyboard(ctx, ctx.user.referral_code),
    },
  );
  if (ctx.userIsNew) {
    await ctx.reply(ctx.t('menu.title'), menuReplyKeyboard(ctx)).catch(() => {});
  }
}

module.exports = { register };
