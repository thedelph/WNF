# Quick Deployment Guide - Existing Portainer Setup

**Your Setup:** Ubuntu Server + Docker + Portainer (already running)
**Goal:** Get bot container running today, authenticate tomorrow when SIM arrives

---

## Step 1: Copy Files to Server

From your Windows machine:

```bash
# Option A: Using SCP (recommended)
scp -r C:\Users\chris\documents\github\wnf\bot user@your-server-ip:~/

# Option B: Using git (if you commit first)
# On server:
ssh user@your-server-ip
git clone https://github.com/your-username/wnf.git
cd wnf/bot
```

Replace `user@your-server-ip` with your actual SSH credentials.

---

## Step 2: Configure Environment Variables

SSH into your server:

```bash
ssh user@your-server-ip
cd ~/bot  # or ~/wnf/bot if using git
```

Create `.env` file:

```bash
cp .env.example .env
nano .env
```

Fill in these values:

```env
# WhatsApp Configuration
WA_SESSION_PATH=/app/sessions
WA_GROUP_ID=                     # Leave empty for now - we'll get this from logs

# Supabase Configuration (GET FROM SUPABASE DASHBOARD)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # Settings → API → service_role key

# Bot Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Webhook Secret (generate random string)
WEBHOOK_SECRET=                  # Run: openssl rand -hex 32

# Admin Phone Numbers (your UK number in E.164 format)
ADMIN_PHONE_NUMBERS=+447123456789
```

**Get Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your WNF project
3. Settings → API
4. Copy `URL` and `service_role` key (NOT anon key!)

**Generate webhook secret:**
```bash
openssl rand -hex 32
```

Save and exit: `Ctrl+X`, `Y`, `Enter`

---

## Step 3: Deploy via Portainer UI

### 3.1 Access Portainer

Open browser: `https://your-server-ip:9443`

### 3.2 Create Stack

1. **Navigate:** Stacks → Add Stack
2. **Name:** `wnf-whatsapp-bot`
3. **Build method:** Choose "Upload"
4. **Upload:** `docker-compose.yml` from `~/bot/`

### 3.3 Add Environment Variables

In the "Environment variables" section, add these from your `.env` file:

| Name | Value |
|------|-------|
| `WA_SESSION_PATH` | `/app/sessions` |
| `WA_GROUP_ID` | *(leave empty for now)* |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `LOG_LEVEL` | `info` |
| `WEBHOOK_SECRET` | *(your generated secret)* |
| `ADMIN_PHONE_NUMBERS` | `+447123456789` |

### 3.4 Deploy

Click **"Deploy the stack"**

Wait ~30-60 seconds for container to build and start.

---

## Step 4: Check Container Status

### 4.1 In Portainer UI

**Navigate:** Containers

You should see:
- **Name:** `wnf-whatsapp-bot`
- **Status:** 🟢 Running
- **State:** healthy (after ~40 seconds)

### 4.2 View Logs

Click on container name → **Logs**

You should see:
```
🚀 Starting WNF WhatsApp Bot...
📍 Environment: production
✅ Supabase client initialized
📱 QR Code received! Scan with your WhatsApp:
```

**Don't scan yet!** Wait for your SIM to arrive tomorrow.

The container will keep trying to authenticate - that's fine. It will show the QR code repeatedly until you scan it.

---

## Step 5: Test Health Endpoint

### From your local machine:

```bash
# Test if bot is responding
curl http://your-server-ip:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "whatsappReady": false,
  "timestamp": "2025-10-10T...",
  "uptime": 123.45,
  "nodeEnv": "production"
}
```

`whatsappReady: false` is normal until you scan QR code tomorrow.

---

## Step 6: Tomorrow - Authenticate WhatsApp

When your SIM arrives:

### 6.1 Activate SIM

1. Put SIM in phone
2. Check you can receive SMS
3. Note the phone number (format: +44...)

### 6.2 View QR Code

**Portainer:** Containers → `wnf-whatsapp-bot` → Logs

You'll see a QR code in ASCII art.

### 6.3 Scan QR Code

1. Open WhatsApp on phone with new SIM
2. Settings → Linked Devices → Link a Device
3. Scan the QR code from logs
4. Wait for "✅ WhatsApp client is ready!"

### 6.4 Get Group Chat ID

1. Send any message to your WNF WhatsApp group
2. Check bot logs immediately
3. Look for: `Message received: { from: '12036...@g.us' }`
4. Copy that ID (format: `12036...@g.us`)

### 6.5 Update Environment Variable

**In Portainer:**
1. Stacks → `wnf-whatsapp-bot` → Editor
2. Update environment variables
3. Set `WA_GROUP_ID` to the ID from step 6.4
4. Click "Update the stack"

Container will restart with group ID configured.

---

## Step 7: Verify Everything Works

### 7.1 Check Health Again

```bash
curl http://your-server-ip:3001/health
```

Should now show:
```json
{
  "status": "ok",
  "whatsappReady": true,    ← Changed to true!
  ...
}
```

### 7.2 Test in WhatsApp Group

Send message to group: `/help`

Bot should respond with available commands.

---

## Troubleshooting

### Container won't start

**Check logs:**
```bash
# In Portainer: Containers → wnf-whatsapp-bot → Logs

# Or via SSH:
docker logs wnf-whatsapp-bot
```

**Common issues:**
- Missing environment variables → Check .env and Portainer env vars match
- Port 3001 already in use → Change PORT in env vars
- Can't connect to Supabase → Check service role key is correct

### Can't see QR code

**Solution:**
```bash
# SSH into server
ssh user@your-server-ip

# View live logs
docker logs -f wnf-whatsapp-bot

# QR code should appear
# Press Ctrl+C when done viewing
```

### Health check fails

**Check:**
1. Is container running? `docker ps`
2. Can you access port 3001? `curl localhost:3001/health` from server
3. Firewall blocking? Try from server first, then from local machine

---

## Commands Reference

### View Logs (Real-time)
```bash
docker logs -f wnf-whatsapp-bot
```

### Restart Container
```bash
docker restart wnf-whatsapp-bot
```

### Stop Container
```bash
docker stop wnf-whatsapp-bot
```

### Remove Container (for rebuild)
```bash
docker-compose down
docker-compose up -d
```

### Check Container Status
```bash
docker ps | grep wnf
```

---

## Next Steps After Authentication

Once bot is authenticated and responding:

1. ✅ Set up Cloudflare Tunnel (for webhooks) - see `HOME_SERVER_DEPLOYMENT.md`
2. ✅ Run database migrations (add `whatsapp_phone` column)
3. ✅ Test commands in WhatsApp group
4. ✅ Link your WhatsApp number to your player profile

See main documentation: `docs/features/WhatsAppBotIntegration.md`

---

## Support

**Having issues?**

1. Check logs: `docker logs wnf-whatsapp-bot`
2. Check health: `curl http://localhost:3001/health`
3. Review error messages carefully
4. Check environment variables are set correctly

**Still stuck?**

Include these in your question:
- Container logs (last 50 lines)
- Health check response
- Environment variables (hide sensitive keys!)
- Error messages

---

**Last Updated:** 2025-10-10
**Status:** Ready to deploy
