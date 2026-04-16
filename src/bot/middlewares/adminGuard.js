/**
 * @file adminGuard middleware — gate on ADMIN_IDS. Applied only to admin commands; regular
 * users never trigger it.
 */

'use strict';

const { adminIds } = require('../../config');

/**
 * @returns {import('telegraf').Middleware<any>}
 */
function adminGuard() {
  return async (ctx, next) => {
    const id = ctx.from && ctx.from.id;
    if (!id || !adminIds.includes(id)) {
      if (ctx.callbackQuery) await ctx.answerCbQuery(ctx.t('admin.not_admin'));
      return;
    }
    return next();
  };
}

/**
 * @param {number} telegramId
 * @returns {boolean}
 */
function isAdmin(telegramId) {
  return adminIds.includes(telegramId);
}

module.exports = adminGuard;
module.exports.isAdmin = isAdmin;
