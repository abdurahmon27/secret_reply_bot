/**
 * @file Auth middleware — upsert user on every update, attach ctx.user and ctx.userIsNew,
 * touch last_active. Runs after session middleware so scenes see a fresh ctx.user.
 */

'use strict';

const users = require('../../db/queries/users');
const logger = require('../../utils/logger');

/**
 * @returns {import('telegraf').Middleware<any>}
 */
function auth() {
  return async (ctx, next) => {
    try {
      if (!ctx.from) return next();
      const { user, isNew } = await users.upsertFromTelegram(ctx.from);
      ctx.user = user;
      ctx.userIsNew = isNew;
      return next();
    } catch (err) {
      logger.error({ err: err.message, ctx: 'auth-middleware', from: ctx.from && ctx.from.id });
      throw err;
    }
  };
}

module.exports = auth;
