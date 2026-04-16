/**
 * @file Winston logger — console + daily rotating file.
 * Format: JSON in production for structured log aggregation; pretty text in dev.
 */

'use strict';

const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const { isProd, logLevel } = require('../config');

const transports = [
  new winston.transports.Console({
    format: isProd
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf((info) => {
            const { timestamp, level, message, ...rest } = info;
            const msg =
              message && typeof message === 'object'
                ? JSON.stringify(message)
                : message != null
                  ? String(message)
                  : '';
            const meta = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
            return `${timestamp} ${level} ${msg}${meta}`;
          }),
        ),
  }),
  new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),
];

const logger = winston.createLogger({
  level: logLevel,
  transports,
  exitOnError: false,
});

module.exports = logger;
