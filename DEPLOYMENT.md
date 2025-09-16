# Coolify Deployment Guide

## The Issue
The app exits in Coolify because it can't complete WhatsApp QR authentication in a containerized environment.

## Solutions

### Option 1: Two-Step Deployment (Recommended)

1. **First Deploy**:
   - Deploy as-is to Coolify
   - Access the deployed URL to see QR code
   - Scan QR code with your phone
   - Let it connect and create session files

2. **Second Deploy**:
   - App will reuse existing session
   - No QR code needed

### Option 2: Pre-authenticate Locally

1. **Run locally** and complete QR scan
2. **Copy session files**: `auth_info_baileys/` folder
3. **Include in deployment** by committing the session folder

### Required Environment Variables in Coolify

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=whatsapp-media
PORT=3008
PHONE_NUMBER=your_phone_number_with_country_code (optional)
```

### Health Check
The app now includes a health endpoint at `/health` that works even before WhatsApp connects.

### Session Persistence
The Dockerfile creates persistent storage for WhatsApp sessions in `/app/auth_info_baileys/`