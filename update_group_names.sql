-- Update old group names to match the latest group name
-- This will merge the three variations into one group

-- Update "Farm photo video gallery" to "Farm photo video gallery_ Creative Collaborators"
UPDATE whatsapp_snippets
SET group_name = 'Farm photo video gallery_ Creative Collaborators'
WHERE group_name = 'Farm photo video gallery';

-- Update "Farm photo video gallery: Creative Collaborators" to "Farm photo video gallery_ Creative Collaborators"
UPDATE whatsapp_snippets
SET group_name = 'Farm photo video gallery_ Creative Collaborators'
WHERE group_name = 'Farm photo video gallery: Creative Collaborators';

-- Verify the update
SELECT group_name, COUNT(*) as message_count
FROM whatsapp_snippets
WHERE group_name LIKE 'Farm photo video gallery%'
GROUP BY group_name
ORDER BY group_name;
