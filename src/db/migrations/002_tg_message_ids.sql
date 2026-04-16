-- 002: track telegram message ids on both sides so we can
--   (a) detect swipe-replies (recipient_tg_message_id)
--   (b) thread the return delivery as a native reply to the sender's
--       originally-typed message (sender_tg_message_id)

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_tg_message_id BIGINT,
  ADD COLUMN IF NOT EXISTS recipient_tg_message_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_tg_msg
  ON messages(recipient_id, recipient_tg_message_id);
