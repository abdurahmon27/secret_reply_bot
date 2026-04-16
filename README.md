# anonbot — anonymous Telegram reply bot

A production Telegram bot that lets every user share a personal `t.me/<bot>?start=ref_XXXX` link. Anyone who opens that link can send one anonymous message. The recipient can anonymously reply or block. Neither side ever learns the other's identity.

## Stack

- Node.js 20 (CommonJS), Telegraf v4
- PostgreSQL 16 (raw SQL, `pg`)
- Redis 7 (`ioredis`) for session + rate-limit
- Zod (env validation), Winston (logging)
- Docker + docker-compose (runtime)
- GitHub Actions (CI/CD)

## Local setup

```bash
cp .env.example .env                    # fill in BOT_TOKEN, HMAC_SECRET, etc.
docker compose up -d postgres redis     # start infra
npm ci
npm run migrate                         # apply DB migrations
npm run dev                             # node --watch src/app.js
```

Local `.env` example:

```env
BOT_TOKEN=123:ABC…
ADMIN_IDS=6393834824
DATABASE_URL=postgres://anonbot:secret@localhost:5432/anonbot
REDIS_URL=redis://localhost:6379
HMAC_SECRET=64-char-hex-or-longer
NODE_ENV=development
```

If running Postgres/Redis via this compose file, also set:

```env
POSTGRES_DB=anonbot
POSTGRES_USER=anonbot
POSTGRES_PASSWORD=secret
```

## Env variables

| Name | Required | Purpose |
| --- | --- | --- |
| `BOT_TOKEN` | yes | Telegram bot token from @BotFather |
| `ADMIN_IDS` | yes | Comma-separated Telegram user IDs with admin access |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis connection string |
| `HMAC_SECRET` | yes | Stable private secret used for `sender_hash` — rotating it orphans reply chains |
| `NODE_ENV` | yes | `production` in prod, `development` locally |
| `LOG_LEVEL` | no | Override winston level (default `info` in prod, `debug` otherwise) |

## DB schema

See `src/db/migrations/001_init.sql`. Tables: `users`, `messages`, `blocks`, `referrals`, `_migrations`.

Sender identity never lives on `messages` — only `sender_hash = HMAC_SHA256(telegram_id, HMAC_SECRET)`. Reply threads resolve a real recipient by looking that hash back up on `users`.

## Deployment

This repo's production process manager is **docker-compose** on `deploy@5.189.181.248`.

### One-time server bootstrap

```bash
ssh deploy@<host>
# install docker if missing — see docs.docker.com/engine/install/
mkdir -p ~/apps/anonbot && cd ~/apps/anonbot
git clone https://github.com/abdurahmon27/secret_reply_bot.git .
cat > .env <<'EOF'
BOT_TOKEN=…
ADMIN_IDS=…
HMAC_SECRET=…
DATABASE_URL=postgres://anonbot:<pgpass>@postgres:5432/anonbot
REDIS_URL=redis://redis:6379
NODE_ENV=production
POSTGRES_DB=anonbot
POSTGRES_USER=anonbot
POSTGRES_PASSWORD=<pgpass>
EOF
docker compose up -d postgres redis
docker compose run --rm bot node src/db/migrate.js
docker compose up -d bot
```

### Continuous deploy

Push to `main` → `.github/workflows/deploy.yml` runs `appleboy/ssh-action`:

```
cd ~/apps/anonbot
git reset --hard origin/main
docker compose build bot
docker compose up -d postgres redis
docker compose run --rm bot node src/db/migrate.js
docker compose up -d bot
docker image prune -f
```

On success/failure, admins get a Telegram notification.

Required GitHub secrets:

- `SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY`
- `BOT_TOKEN`, `ADMIN_IDS` (used by the deploy-notification step)

## Admin commands

- `/admin` — menu with Stats / Broadcast buttons
- `/stats` — totals
- `/broadcast` — scene: message → preview → confirm → throttled fan-out (30 msg/s)
- `/ban <id>` / `/unban <id>`
- `/userinfo <id>`

## Project layout

```
src/
├── app.js                      # entry
├── config.js                   # Zod-validated env
├── bot/{index,middlewares,scenes}
├── commands/                   # start, menu, help, admin
├── handlers/                   # callbackQuery, message fallback
├── db/{index,migrate,migrations,queries}
├── i18n/{index,locales}
└── utils/                      # hash, keyboards, formatters, logger, redis, constants
```
