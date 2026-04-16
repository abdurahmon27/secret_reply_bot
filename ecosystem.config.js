/**
 * @file PM2 process descriptor. Production uses docker-compose as the process manager,
 * but this file is retained for bare-metal / local `pm2 start` usage.
 */

module.exports = {
  apps: [
    {
      name: 'anonbot',
      script: 'src/app.js',
      interpreter: 'node',
      max_memory_restart: '300M',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: { NODE_ENV: 'production' },
    },
  ],
};
