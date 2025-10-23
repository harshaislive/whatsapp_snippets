-- Find the last (most recent) message from the Farm gallery group
-- This will help us determine from which date to import new messages

-- Get the last message of any type
SELECT
  timestamp,
  message_type,
  sender_name,
  CASE
    WHEN message_type IN ('image', 'video') THEN caption
    ELSE LEFT(content, 100)
  END as preview,
  created_at
FROM whatsapp_snippets
WHERE group_name = 'Farm photo video gallery_ Creative Collaborators'
ORDER BY timestamp DESC
LIMIT 1;

-- Get the last message by type (to see last text, image, video separately)
SELECT
  message_type,
  MAX(timestamp) as last_message_timestamp,
  COUNT(*) as total_messages
FROM whatsapp_snippets
WHERE group_name = 'Farm photo video gallery_ Creative Collaborators'
GROUP BY message_type
ORDER BY last_message_timestamp DESC;

-- Get date range of existing messages
SELECT
  MIN(timestamp) as first_message,
  MAX(timestamp) as last_message,
  COUNT(*) as total_messages,
  COUNT(DISTINCT DATE(timestamp)) as days_with_messages
FROM whatsapp_snippets
WHERE group_name = 'Farm photo video gallery_ Creative Collaborators';

-- Get last 10 messages to review
SELECT
  timestamp,
  message_type,
  sender_name,
  CASE
    WHEN message_type IN ('image', 'video') THEN caption
    ELSE LEFT(content, 50)
  END as preview
FROM whatsapp_snippets
WHERE group_name = 'Farm photo video gallery_ Creative Collaborators'
ORDER BY timestamp DESC
LIMIT 10;
