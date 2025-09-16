import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { BaileysProvider } from '@builderbot/provider-baileys'
import { MemoryDB } from '@builderbot/bot'
import { createClient } from '@supabase/supabase-js'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import dotenv from 'dotenv'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabaseBucket = process.env.SUPABASE_BUCKET || 'whatsapp-media'
const supabase = createClient(supabaseUrl, supabaseKey)

const getMessageType = (message) => {
  const typeKey = Object.keys(message || {})[0]
  const typeMap = {
    conversation: 'text',
    extendedTextMessage: 'text',
    imageMessage: 'image',
    videoMessage: 'video',
    documentMessage: 'document',
    audioMessage: 'audio',
    locationMessage: 'location',
  }
  return typeMap[typeKey] || 'unknown'
}

const uploadMediaToSupabase = async (buffer, fileName, mimeType) => {
  try {
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false
      })
    
    if (error) {
      console.error('Media upload error:', error)
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(fileName)
    
    return publicUrl
  } catch (error) {
    console.error('Media upload exception:', error)
    return null
  }
}

const getContent = (message) => {
  if (message.conversation) return message.conversation
  if (message.extendedTextMessage) return message.extendedTextMessage.text
  if (message.imageMessage?.caption) return message.imageMessage.caption
  if (message.videoMessage?.caption) return message.videoMessage.caption
  if (message.documentMessage?.title) return message.documentMessage.title
  if (message.audioMessage) return 'Voice note'
  if (message.locationMessage) return 'Location shared'
  return 'Message content'
}

const getCaption = (message) => {
  const typeKey = Object.keys(message || {})[0]
  return message[typeKey]?.caption || null
}

const saveToSupabase = async (ctx, provider) => {
  const senderJid = ctx.key.participant || ctx.key.remoteJid
  const timestamp = new Date(ctx.messageTimestamp * 1000).toISOString()
  const messageType = getMessageType(ctx.message)
  const content = getContent(ctx.message)
  const senderName = ctx.pushName || null
  const rawMessage = ctx
  const caption = getCaption(ctx.message)
  const isGroup = ctx.key.remoteJid.endsWith('@g.us')
  let groupName = null
  let mediaUrl = null
  
  if (isGroup) {
    const metadata = await provider.groupMetadata(ctx.key.remoteJid)
    groupName = metadata.subject || null
  }

  // Handle media upload
  if (['image', 'video', 'document', 'audio'].includes(messageType)) {
    try {
      const messageContent = ctx.message[Object.keys(ctx.message)[0]]
      if (messageContent) {
        const stream = await downloadContentFromMessage(messageContent, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])
        }

        if (buffer.length > 0) {
          const fileExtension = getFileExtension(ctx.message, messageType)
          const fileName = `${uuidv4()}.${fileExtension}`
          const mimeType = getMimeType(ctx.message, messageType)

          mediaUrl = await uploadMediaToSupabase(buffer, fileName, mimeType)
          console.log(`📁 Media uploaded: ${fileName} -> ${mediaUrl}`)
        }
      }
    } catch (error) {
      console.error('Media download/upload error:', error)
      mediaUrl = 'media_upload_failed'
    }
  }

  const { error } = await supabase.from('whatsapp_snippets').insert({
    sender_jid: senderJid,
    timestamp,
    message_type: messageType,
    content: mediaUrl || content, // Use mediaUrl for media, content for text
    sender_name: senderName,
    raw_message: rawMessage,
    caption,
    group_name: groupName,
    is_group: isGroup,
  })

  if (error) {
    console.error('Supabase insert error:', error)
  }
}

const getFileExtension = (message, messageType) => {
  const typeKey = Object.keys(message || {})[0]
  const messageData = message[typeKey]
  
  if (messageData?.mimetype) {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    }
    return mimeToExt[messageData.mimetype] || 'bin'
  }
  
  const typeToExt = {
    'image': 'jpg',
    'video': 'mp4',
    'audio': 'ogg',
    'document': 'pdf'
  }
  return typeToExt[messageType] || 'bin'
}

const getMimeType = (message, messageType) => {
  const typeKey = Object.keys(message || {})[0]
  const messageData = message[typeKey]
  
  if (messageData?.mimetype) {
    return messageData.mimetype
  }
  
  const defaultMimes = {
    'image': 'image/jpeg',
    'video': 'video/mp4',
    'audio': 'audio/ogg',
    'document': 'application/octet-stream'
  }
  return defaultMimes[messageType] || 'application/octet-stream'
}

const textFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, { provider }) => {
    await saveToSupabase(ctx, provider)
  })

const mediaFlow = addKeyword(EVENTS.MEDIA)
  .addAction(async (ctx, { provider }) => {
    await saveToSupabase(ctx, provider)
  })

const documentFlow = addKeyword(EVENTS.DOCUMENT)
  .addAction(async (ctx, { provider }) => {
    await saveToSupabase(ctx, provider)
  })

const voiceFlow = addKeyword(EVENTS.VOICE_NOTE)
  .addAction(async (ctx, { provider }) => {
    await saveToSupabase(ctx, provider)
  })

const locationFlow = addKeyword(EVENTS.LOCATION)
  .addAction(async (ctx, { provider }) => {
    await saveToSupabase(ctx, provider)
  })

const main = async () => {
  const adapterFlow = createFlow([textFlow, mediaFlow, documentFlow, voiceFlow, locationFlow])
  const adapterProvider = createProvider(BaileysProvider)
  const adapterDB = new MemoryDB()

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  const port = process.env.PORT || 3008
  const server = httpServer(port)

  // Add health check endpoint for Coolify
  server.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() })
  })

  console.log(`🚀 Bot server running on http://localhost:${port}`)
  console.log(`🔍 Health check available at http://localhost:${port}/health`)
}

main()
