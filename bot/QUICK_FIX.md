# Quick Fix - Portainer Deployment Error

**Error:** `failed to read dockerfile: open Dockerfile: no such file or directory`

**Cause:** Portainer's stack upload only uploads the docker-compose.yml, not the Dockerfile.

**Solution:** Build the image on the server first, then deploy.

---

## Option 1: Deploy via SSH (Fastest) ⚡

**Step 1: Make sure files are on server**

```bash
# From your Windows machine
scp -r C:\Users\chris\documents\github\wnf\bot user@your-server-ip:~/
```

**Step 2: SSH and deploy**

```bash
# SSH into server
ssh user@your-server-ip
cd ~/bot

# Create .env file
cp .env.example .env
nano .env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET, ADMIN_PHONE_NUMBERS
# Save: Ctrl+X, Y, Enter

# Build and start
docker-compose build
docker-compose up -d

# View logs (to see QR code tomorrow)
docker logs -f wnf-whatsapp-bot
```

**Done!** Container is now running and visible in Portainer UI.

---

## Option 2: Use Portainer After Building Image

**Step 1: Build image via SSH first**

```bash
ssh user@your-server-ip
cd ~/bot

# Build the Docker image
docker build -t wnf-whatsapp-bot:latest .

# Verify image exists
docker images | grep wnf
```

**Step 2: Deploy in Portainer**

1. **Remove failed stack** (if exists):
   - Portainer → Stacks → `wnf-whatsapp-bot` → Delete

2. **Create new stack**:
   - Portainer → Stacks → Add Stack
   - Name: `wnf-whatsapp-bot`
   - Upload: `docker-compose.portainer.yml` (NOT docker-compose.yml)
   - Add environment variables from .env
   - Deploy

---

## Checking Status

### View in Portainer

**Navigate:** Containers

You should see:
- Name: `wnf-whatsapp-bot`
- Status: 🟢 Running
- Image: `wnf-whatsapp-bot:latest`

### View Logs

**Option A - Portainer:**
Containers → `wnf-whatsapp-bot` → Logs

**Option B - SSH:**
```bash
docker logs -f wnf-whatsapp-bot
```

### Test Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "whatsappReady": false,
  "timestamp": "2025-10-10T...",
  "uptime": 123.45
}
```

---

## Managing the Container

### Start/Stop/Restart

**Via Portainer:**
Containers → `wnf-whatsapp-bot` → Start/Stop/Restart buttons

**Via SSH:**
```bash
docker stop wnf-whatsapp-bot
docker start wnf-whatsapp-bot
docker restart wnf-whatsapp-bot
```

### Update Code

```bash
# SSH into server
cd ~/bot

# Pull latest code (if using git)
git pull

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Common Issues

### Port 3001 already in use

**Check what's using it:**
```bash
sudo lsof -i :3001
# or
sudo netstat -tulpn | grep 3001
```

**Change port:**
Edit `.env` or environment variables:
```env
PORT=3002  # Use different port
```

Update docker-compose.yml ports section:
```yaml
ports:
  - "3002:3002"  # Match new port
```

### Can't connect to Supabase

**Verify credentials:**
```bash
# Test from server
curl https://YOUR_PROJECT.supabase.co/rest/v1/
```

Should return 401 (auth required) - that's OK, means it's reachable.

**Check service role key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy `service_role` key (NOT `anon` key!)

### Container keeps restarting

**Check logs:**
```bash
docker logs --tail 100 wnf-whatsapp-bot
```

**Common causes:**
- Missing environment variables
- Wrong Supabase credentials
- Port conflict
- Out of memory

---

## Environment Variables Reference

```env
# Required
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # From Supabase → Settings → API

# Required (generate random)
WEBHOOK_SECRET=$(openssl rand -hex 32)

# Optional (leave empty initially)
WA_GROUP_ID=

# Recommended
ADMIN_PHONE_NUMBERS=+447123456789
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
```

---

## Next Steps

Once container is running:

1. ✅ **Wait for SIM** to arrive tomorrow
2. ✅ **View logs** to see QR code
3. ✅ **Scan QR code** with WhatsApp
4. ✅ **Get group ID** from logs
5. ✅ **Update WA_GROUP_ID** environment variable
6. ✅ **Restart container**
7. ✅ **Test** with `/help` in WhatsApp group

---

## Still Having Issues?

**Share these details:**

```bash
# Container status
docker ps -a | grep wnf

# Last 50 log lines
docker logs --tail 50 wnf-whatsapp-bot

# Health check
curl http://localhost:3001/health

# Environment check (hide sensitive values!)
docker exec wnf-whatsapp-bot env | grep -E "NODE_ENV|PORT|LOG_LEVEL"
```

**DO NOT share:**
- SUPABASE_SERVICE_ROLE_KEY
- WEBHOOK_SECRET
- Full environment output

---

**Last Updated:** 2025-10-10
**Status:** Quick fix for Portainer deployment
