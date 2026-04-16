/**
 * @file i18n helper. Loads locale JSON files at require time; provides `t(ctx, key, vars)`
 * and a language-agnostic `translate(lang, key, vars)` used for broadcast.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { LANGUAGES, DEFAULT_LANGUAGE } = require('../utils/constants');

const LOCALES = {};
for (const lang of LANGUAGES) {
  const file = path.join(__dirname, 'locales', `${lang}.json`);
  LOCALES[lang] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Look up a nested key like "compose.delivered". */
function lookup(dict, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), dict);
}

/**
 * Interpolate `{name}` placeholders.
 * @param {string} template
 * @param {Record<string,string|number>} [vars]
 */
function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

/**
 * Translate using an explicit language.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string,string|number>} [vars]
 */
function translate(lang, key, vars) {
  const pick = LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  const raw = lookup(LOCALES[pick], key) ?? lookup(LOCALES[DEFAULT_LANGUAGE], key);
  if (raw == null) return key;
  return interpolate(raw, vars);
}

/**
 * Translate using the context's user language.
 * @param {{user?:{language?:string}}} ctx
 * @param {string} key
 * @param {Record<string,string|number>} [vars]
 */
function t(ctx, key, vars) {
  const lang = (ctx && ctx.user && ctx.user.language) || DEFAULT_LANGUAGE;
  return translate(lang, key, vars);
}

module.exports = { t, translate };
