/**
 * WhatsApp Chat Import Script
 *
 * Imports WhatsApp chat export to Supabase
 * - Parses chat.txt file
 * - Uploads media to Supabase Storage
 * - Inserts messages to database
 *
 * Usage: node scripts/import-whatsapp.js [--dry-run] [--limit 100]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const CONFIG = {
  CHAT_FOLDER: path.join(__dirname, '../../WhatsApp Chat with Farm photo video gallery_ Creative Collaborators'),
  CHAT_FILE: 'WhatsApp Chat with Farm photo video gallery Creative Collaborators.txt',
  GROUP_NAME: 'Farm photo video gallery_ Creative Collaborators',
  CUTOFF_DATE: new Date('2025-10-05T21:14:00Z'),
  STORAGE_BUCKET: 'whatsapp-media',
  STORAGE_PATH: 'farm-gallery/test-import',
  TEST_LIMIT: 100, // Import only first 100 new messages for testing
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const messageLimit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : CONFIG.TEST_LIMIT;

console.log('\n=== WhatsApp Import Script ===\n');
console.log(`Mode: ${isDryRun ? '🧪 DRY RUN' : '🚀 LIVE IMPORT'}`);
console.log(`Limit: ${messageLimit} messages\n`);

/**
 * Parse WhatsApp timestamp format: "DD/MM/YY, HH:MM am/pm"
 * Example: "23/10/25, 1:13 pm" -> 2025-10-23T13:13:00Z
 */
function parseWhatsAppDate(dateStr, timeStr, period) {
  const [day, month, year] = dateStr.split('/').map(Number);
  let [hours, minutes] = timeStr.split(':').map(Number);

  // Convert to 24-hour format
  if (period.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }

  // Assume 20xx for years
  const fullYear = 2000 + year;

  // Create date in UTC
  const date = new Date(Date.UTC(fullYear, month - 1, day, hours, minutes, 0));
  return date;
}

/**
 * Generate sender_jid from sender name or phone
 */
function generateSenderJid(senderName) {
  // If it's a phone number, use it directly
  if (senderName.match(/^\+?\d+/)) {
    return senderName.replace(/[^\d+]/g, '');
  }

  // Otherwise, create a hash-like ID from the name
  let hash = 0;
  for (let i = 0; i < senderName.length; i++) {
    const char = senderName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash)}`;
}

/**
 * Parse WhatsApp chat file
 */
function parseChatFile() {
  const filePath = path.join(CONFIG.CHAT_FOLDER, CONFIG.CHAT_FILE);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Chat file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const messages = [];
  let currentMessage = null;

  // Regex to match message start: "DD/MM/YY, HH:MM am/pm - Sender: Message"
  const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2}),\s+(\d{1,2}:\d{2})\s+(am|pm)\s+-\s+([^:]+):\s*(.*)$/i;

  for (const line of lines) {
    const match = line.match(messageRegex);

    if (match) {
      // Save previous message
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, dateStr, timeStr, period, sender, messageText] = match;
      const timestamp = parseWhatsAppDate(dateStr, timeStr, period);

      // Detect message type and media filename
      let messageType = 'text';
      let content = messageText.trim();
      let mediaFilename = null;
      let caption = null;

      // Check for media attachments
      const mediaMatch = messageText.match(/(IMG|VID|AUD|DOC)-[\w-]+\.(jpg|jpeg|png|mp4|mov|opus|pdf|docx?)/i);
      if (mediaMatch) {
        mediaFilename = mediaMatch[0];
        messageType = mediaFilename.startsWith('IMG') ? 'image' :
                     mediaFilename.startsWith('VID') ? 'video' :
                     mediaFilename.startsWith('AUD') ? 'audio' : 'document';
        content = ''; // Will be replaced with media URL later
      } else if (messageText.includes('<Media omitted>')) {
        // Media not exported
        messageType = 'unknown';
        content = 'Media not available in export';
      }

      currentMessage = {
        timestamp,
        sender_name: sender.trim(),
        sender_jid: generateSenderJid(sender.trim()),
        message_type: messageType,
        content,
        caption: null,
        media_filename: mediaFilename,
        raw_message: line,
      };
    } else if (currentMessage && line.trim()) {
      // Continuation of previous message (multi-line or caption)
      if (currentMessage.media_filename && !currentMessage.caption) {
        // This is likely a caption for the media
        currentMessage.caption = line.trim();
      } else {
        // Multi-line text message
        currentMessage.content += '\n' + line.trim();
      }
    }
  }

  // Add last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

/**
 * Filter messages after cutoff date
 */
function filterNewMessages(messages) {
  return messages.filter(msg => msg.timestamp > CONFIG.CUTOFF_DATE);
}

/**
 * Upload media file to Supabase Storage
 */
async function uploadMedia(filename) {
  const filePath = path.join(CONFIG.CHAT_FOLDER, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Media file not found: ${filename}`);
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `${CONFIG.STORAGE_PATH}/${filename}`;

    const { data, error } = await supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(filename),
        upsert: false,
      });

    if (error) {
      console.error(`❌ Error uploading ${filename}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error(`❌ Error uploading ${filename}:`, err.message);
    return null;
  }
}

/**
 * Get content type from filename
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.opus': 'audio/opus',
    '.pdf': 'application/pdf',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Insert messages to database
 */
async function insertMessages(messages) {
  const records = messages.map(msg => ({
    sender_jid: msg.sender_jid,
    timestamp: msg.timestamp.toISOString(),
    message_type: msg.message_type,
    content: msg.content || '',
    sender_name: msg.sender_name,
    caption: msg.caption,
    group_name: CONFIG.GROUP_NAME,
    is_group: true,
    raw_message: { original: msg.raw_message },
  }));

  const { data, error } = await supabase
    .from('whatsapp_snippets')
    .insert(records)
    .select();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  return data;
}

/**
 * Main import function
 */
async function main() {
  try {
    console.log('[PREP] Reading chat file...');
    const allMessages = parseChatFile();
    console.log(`[PREP] ✓ Parsed ${allMessages.length} total messages from chat file`);

    console.log(`[FILTER] Filtering messages after ${CONFIG.CUTOFF_DATE.toISOString()}...`);
    const newMessages = filterNewMessages(allMessages);
    console.log(`[FILTER] ✓ Found ${newMessages.length} new messages after cutoff date`);

    if (newMessages.length === 0) {
      console.log('\n✅ No new messages to import!');
      return;
    }

    // Limit to test batch
    const messagesToImport = newMessages.slice(0, messageLimit);
    console.log(`[LIMIT] ✓ Limited to ${messagesToImport.length} messages for test import\n`);

    // Count media files
    const mediaMessages = messagesToImport.filter(msg => msg.media_filename);
    console.log(`[ANALYSIS] Messages breakdown:`);
    console.log(`  ├─ Total: ${messagesToImport.length}`);
    console.log(`  ├─ Text: ${messagesToImport.filter(m => m.message_type === 'text').length}`);
    console.log(`  ├─ Images: ${messagesToImport.filter(m => m.message_type === 'image').length}`);
    console.log(`  ├─ Videos: ${messagesToImport.filter(m => m.message_type === 'video').length}`);
    console.log(`  └─ Other: ${messagesToImport.filter(m => !['text', 'image', 'video'].includes(m.message_type)).length}\n`);

    if (isDryRun) {
      console.log('🧪 DRY RUN - Showing first 5 messages:\n');
      messagesToImport.slice(0, 5).forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.timestamp.toISOString()}] ${msg.sender_name}`);
        console.log(`   Type: ${msg.message_type}`);
        if (msg.media_filename) console.log(`   Media: ${msg.media_filename}`);
        if (msg.caption) console.log(`   Caption: ${msg.caption}`);
        if (msg.content && msg.message_type === 'text') console.log(`   Content: ${msg.content.substring(0, 50)}...`);
        console.log('');
      });
      console.log('\n✅ DRY RUN COMPLETE - No data was imported');
      console.log(`\nTo import for real, run: node scripts/import-whatsapp.js --limit ${messageLimit}\n`);
      return;
    }

    // Upload media files
    if (mediaMessages.length > 0) {
      console.log(`[UPLOAD] Uploading ${mediaMessages.length} media files...`);
      let uploaded = 0;
      let failed = 0;

      for (const msg of mediaMessages) {
        if (msg.media_filename) {
          const url = await uploadMedia(msg.media_filename);
          if (url) {
            msg.content = url;
            uploaded++;
            process.stdout.write(`\r[UPLOAD] Progress: ${uploaded + failed}/${mediaMessages.length} (${uploaded} uploaded, ${failed} failed)`);
          } else {
            failed++;
            msg.content = 'Media upload failed';
          }
        }
      }
      console.log(`\n[UPLOAD] ✓ Complete: ${uploaded} uploaded, ${failed} failed\n`);
    }

    // Insert to database
    console.log('[INSERT] Inserting messages to database...');
    const inserted = await insertMessages(messagesToImport);
    console.log(`[INSERT] ✓ Inserted ${inserted.length} messages\n`);

    console.log('✅ IMPORT COMPLETE!\n');
    console.log('────────────────────────────────────');
    console.log(`Imported: ${inserted.length} messages`);
    console.log(`Date range: ${messagesToImport[0].timestamp.toISOString().split('T')[0]} to ${messagesToImport[messagesToImport.length - 1].timestamp.toISOString().split('T')[0]}`);
    console.log('────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the import
main();
