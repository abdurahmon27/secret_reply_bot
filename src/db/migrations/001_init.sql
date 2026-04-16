-- 001_init: users, messages, blocks, referrals

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  username TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('uz','ru','en')),
  referral_code TEXT UNIQUE NOT NULL,
  sender_hash TEXT UNIQUE NOT NULL,
  referred_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_sender_hash ON users(sender_hash);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_hash TEXT NOT NULL,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('text','photo','voice','sticker')),
  content JSONB NOT NULL,
  in_reply_to BIGINT REFERENCES messages(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_hash ON messages(sender_hash);

CREATE TABLE IF NOT EXISTS blocks (
  id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipient_id, sender_hash)
);
CREATE INDEX IF NOT EXISTS idx_blocks_recipient ON blocks(recipient_id);

CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referee_id)
);
