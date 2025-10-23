# WhatsApp Import Script

Import WhatsApp chat exports into Supabase.

## Prerequisites

1. **Supabase Storage Bucket:** Create a bucket named `whatsapp-media` (if not exists)
   - Go to Supabase Dashboard → Storage
   - Create new bucket: `whatsapp-media`
   - Make it public or configure appropriate policies

2. **Environment Variables:** Make sure `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

## Usage

### Step 1: Dry Run (Preview Only)
Preview what will be imported without making any changes:

```bash
cd whatsapp_snippets
npm run import:dry-run
```

This will:
- Parse the chat file
- Filter messages after cutoff date (Oct 5, 2025 21:14)
- Show first 5 messages that would be imported
- **NOT** upload media or insert to database

### Step 2: Test Import (100 Messages)
Import first 100 new messages:

```bash
npm run import:test
```

This will:
- Import 100 messages
- Upload associated media files
- Insert records to database
- ✅ **Safe for testing**

### Step 3: Verify in App
- Open your app and check if messages appear correctly
- Verify media files load properly
- Check dates, senders, captions

### Step 4: Full Import (After Confirmation)
Once test import looks good, run full import:

```bash
npm run import:full
```

This imports up to 10,000 new messages (all remaining messages after Oct 5, 2025).

## Configuration

Edit `scripts/import-whatsapp.js` to customize:

```javascript
const CONFIG = {
  CHAT_FOLDER: '../../WhatsApp Chat with Farm photo video gallery_ Creative Collaborators',
  CUTOFF_DATE: new Date('2025-10-05T21:14:00Z'), // Only import messages after this
  STORAGE_BUCKET: 'whatsapp-media',
  STORAGE_PATH: 'farm-gallery/test-import', // Change for full import
  TEST_LIMIT: 100,
};
```

## Troubleshooting

### "Chat file not found"
- Verify the WhatsApp export folder is in the correct location
- Check the folder name matches exactly

### "Supabase credentials not found"
- Make sure `.env.local` exists
- Run from `whatsapp_snippets` directory (not `scripts`)

### "Media file not found"
- Some media might be missing from export (`<Media omitted>`)
- Script will log warnings but continue

### "Database insert failed"
- Check Supabase connection
- Verify table schema matches script expectations
- Check for duplicate records

## What Gets Imported

For each message:
- `sender_jid`: Phone number or hash of sender name
- `timestamp`: Parsed from WhatsApp format (DD/MM/YY, HH:MM am/pm)
- `sender_name`: As shown in chat
- `message_type`: text, image, video, audio, document, unknown
- `content`: Message text or media URL
- `caption`: For media messages
- `group_name`: "Farm photo video gallery_ Creative Collaborators"
- `is_group`: true
- `raw_message`: Original line from chat file

## Date Format

WhatsApp format: `23/10/25, 1:13 pm`
Converted to: `2025-10-23T13:13:00Z` (UTC)

## Storage Structure

Media files uploaded to:
```
whatsapp-media/
└── farm-gallery/
    └── test-import/
        ├── IMG-20250515-WA0015.jpg
        ├── VID-20250515-WA0051.mp4
        └── ...
```

## Notes

- Script skips system messages (group events, etc.)
- Multi-line messages are concatenated
- Media captions are linked to their media
- `<Media omitted>` entries are marked as unavailable
