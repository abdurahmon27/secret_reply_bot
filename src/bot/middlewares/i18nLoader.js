/**
 * @file i18nLoader middleware — binds ctx.t(key, vars) to the authenticated user's language.
 */

'use strict';

const { t } = require('../../i18n');

/**
 * @returns {import('telegraf').Middleware<any>}
 */
function i18nLoader() {
  return (ctx, next) => {
    ctx.t = (key, vars) => t(ctx, key, vars);
    return next();
  };
}

module.exports = i18nLoader;
