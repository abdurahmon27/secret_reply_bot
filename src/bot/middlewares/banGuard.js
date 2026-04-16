/**
 * @file banGuard middleware — short-circuits all updates from banned users with a
 * single localized notice and stops the chain.
 */

'use strict';

/**
 * @returns {import('telegraf').Middleware<any>}
 */
function banGuard() {
  return async (ctx, next) => {
    if (ctx.user && ctx.user.is_banned) {
      try {
        if (ctx.callbackQuery) await ctx.answerCbQuery(ctx.t('start.banned'));
        else await ctx.reply(ctx.t('start.banned'));
      } catch (_) {
        // ignore send errors to banned users
      }
      return;
    }
    return next();
  };
}

module.exports = banGuard;
