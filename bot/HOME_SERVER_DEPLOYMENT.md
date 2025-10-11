# Home Server Deployment Guide

**Target Environment:** Proxmox VM + Portainer + Docker
**Webhook Solution:** Cloudflare Tunnel (free, secure, no port forwarding)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│        Your Home Server (Proxmox)                   │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  Docker Container (Portainer)              │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  WNF WhatsApp Bot                    │ │   │
│  │  │  • Port 3001 (internal)              │ │   │
│  │  │  • Persistent volumes for sessions   │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────┘   │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  Cloudflare Tunnel (cloudflared)           │   │
│  │  • Proxies port 3001 to internet           │   │
│  │  • HTTPS by default                        │   │
│  │  • No port forwarding needed               │   │
│  └────────────────────────────────────────────┘   │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ Outbound: Bot → Supabase
                   │ Inbound: Supabase → Cloudflare Tunnel → Bot
                   ▼
┌──────────────────────────────────────────────────────┐
│            Cloud Services                            │
│  • Supabase (database + edge functions)             │
│  • Vercel (React web app)                           │
│  • WhatsApp Web (via bot)                           │
└──────────────────────────────────────────────────────┘
```

---

## Prerequisites Checklist

- [ ] Proxmox server with VM running (Debian/Ubuntu recommended)
- [ ] Docker installed on VM
- [ ] Portainer installed and accessible
- [ ] Supabase project with service role key
- [ ] Secondary phone number for WhatsApp
- [ ] Cloudflare account (free tier)

---

## Step 1: Prepare Your VM

### 1.1 Create/Access Your VM

If you don't have a VM yet:

1. **In Proxmox:**
   - Create new VM (Debian 12 or Ubuntu 22.04)
   - Allocate: 2 CPU cores, 4GB RAM, 20GB disk
   - Install operating system

2. **SSH into VM:**
   ```bash
   ssh user@your-vm-ip
   ```

### 1.2 Install Docker (if not already installed)

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes
exit
ssh user@your-vm-ip

# Verify Docker
docker --version
```

### 1.3 Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

### 1.4 Install Portainer (if not already installed)

```bash
# Create Portainer volume
docker volume create portainer_data

# Run Portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Access Portainer
echo "Access Portainer at: https://your-vm-ip:9443"
```

---

## Step 2: Deploy Bot via Portainer

### 2.1 Copy Bot Files to Server

**From your development machine:**

```bash
# Create deployment directory on server
ssh user@your-vm-ip 'mkdir -p ~/wnf-bot'

# Copy bot directory to server
scp -r bot/* user@your-vm-ip:~/wnf-bot/

# Or use git (recommended)
ssh user@your-vm-ip
cd ~
git clone https://github.com/your-username/wnf.git
cd wnf/bot
```

### 2.2 Create Environment File

```bash
# On the server
cd ~/wnf-bot
cp .env.example .env
nano .env
```

**Configure `.env`:**

```env
# WhatsApp Configuration
WA_SESSION_PATH=/app/sessions
WA_GROUP_ID=                                    # Get this after first run (from logs)

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # From Supabase dashboard

# Bot Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Webhook Authentication
WEBHOOK_SECRET=                                 # Generate: openssl rand -hex 32

# Admin Phone Numbers (E.164 format)
ADMIN_PHONE_NUMBERS=+447123456789
```

**Generate webhook secret:**
```bash
openssl rand -hex 32
# Copy output to WEBHOOK_SECRET
```

### 2.3 Deploy via Portainer UI

**Option A: Portainer Stacks (Recommended)**

1. **Access Portainer:** `https://your-vm-ip:9443`
2. **Navigate:** Stacks → Add Stack
3. **Configure:**
   - **Name:** `wnf-whatsapp-bot`
   - **Build method:** Upload `docker-compose.yml`
   - **Environment variables:** Add from `.env` file
4. **Deploy:** Click "Deploy the stack"

**Option B: Portainer Custom Template**

1. Navigate to: App Templates → Custom Templates
2. Click "Add Custom Template"
3. Paste `docker-compose.yml` content
4. Save and deploy

**Option C: Command Line (Alternative)**

```bash
# On the server
cd ~/wnf-bot
docker-compose up -d
```

### 2.4 Authenticate WhatsApp

1. **View logs to get QR code:**
   - **Portainer:** Containers → `wnf-whatsapp-bot` → Logs
   - **CLI:** `docker logs wnf-whatsapp-bot -f`

2. **Scan QR code** with your secondary WhatsApp account

3. **Wait for authentication:** Look for "WhatsApp client is ready!" in logs

4. **Session is persisted** - you won't need to scan again unless session expires

### 2.5 Get WhatsApp Group ID

After authentication:

1. Send any message to your WNF WhatsApp group
2. Check bot logs for the group chat ID
3. Look for line like: `Message from: 120363...@g.us`
4. Copy the chat ID (format: `12036...@g.us`)
5. Update `.env` with `WA_GROUP_ID=12036...@g.us`
6. Restart container: `docker-compose restart` or via Portainer

---

## Step 3: Set Up Cloudflare Tunnel

Cloudflare Tunnel creates a secure connection from your home server to the internet without port forwarding.

### 3.1 Install Cloudflared on Server

```bash
# SSH into your server
ssh user@your-vm-ip

# Download and install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

### 3.2 Authenticate with Cloudflare

```bash
# This will open a browser window
cloudflared tunnel login
```

**If you're on a headless server:**
1. Copy the URL from the terminal
2. Open it on your local machine
3. Log in to Cloudflare
4. Authorize the tunnel

### 3.3 Create Tunnel

```bash
# Create tunnel
cloudflared tunnel create wnf-whatsapp-bot

# Note the tunnel ID from output (format: 12345678-1234-1234-1234-123456789012)
```

### 3.4 Configure Tunnel

```bash
# Create config directory
mkdir -p ~/.cloudflared

# Create config file
nano ~/.cloudflared/config.yml
```

**Add configuration:**

```yaml
url: http://localhost:3001
tunnel: <TUNNEL_ID_FROM_STEP_3>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

# Optional: Configure ingress rules
ingress:
  - hostname: wnf-bot.your-domain.com  # Optional custom domain
    service: http://localhost:3001
  - service: http_status:404
```

**Save and exit** (Ctrl+X, Y, Enter)

### 3.5 Run Tunnel

**Method A: Run as systemd service (Recommended for production)**

```bash
# Install as service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

**Method B: Run manually (for testing)**

```bash
cloudflared tunnel run wnf-whatsapp-bot
```

### 3.6 Get Tunnel URL

```bash
# Get tunnel info
cloudflared tunnel info wnf-whatsapp-bot

# Or use a default tunnel URL
echo "Your tunnel URL: https://wnf-whatsapp-bot.trycloudflare.com"
```

**Note:** Free Cloudflare tunnels give you a random `*.trycloudflare.com` domain. For a custom domain, configure it in Cloudflare DNS.

### 3.7 Test Webhook Endpoint

```bash
# Test health check
curl https://your-tunnel-url/health

# Expected response:
# {"status":"ok","whatsappReady":true,"timestamp":"2025-10-10T..."}
```

---

## Step 4: Update Supabase Edge Function

### 4.1 Set Tunnel URL in Supabase

1. **Go to Supabase Dashboard:** Project → Edge Functions
2. **Deploy** `send-whatsapp-announcement` function (if not already)
3. **Set environment variables:**
   - `BOT_WEBHOOK_URL`: `https://your-tunnel-url` (without `/send`)
   - `BOT_WEBHOOK_SECRET`: Same as in bot's `.env`

### 4.2 Test Edge Function

```bash
# Invoke edge function manually
curl -X POST 'https://your-project.supabase.co/functions/v1/send-whatsapp-announcement' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"gameId":"test-game-id","announcementType":"announcement"}'
```

---

## Step 5: Verify Deployment

### 5.1 Check Container Status

**Portainer UI:**
- Navigate to: Containers
- Status should be: **Running** (green)
- Health: **Healthy** (if configured)

**CLI:**
```bash
docker ps
# Should show wnf-whatsapp-bot container running
```

### 5.2 Check Logs

**Portainer:**
- Containers → `wnf-whatsapp-bot` → Logs

**CLI:**
```bash
docker logs wnf-whatsapp-bot --tail 50
```

**Look for:**
- ✅ `WhatsApp client is ready!`
- ✅ `Bot HTTP server listening on port 3001`
- ✅ `Supabase client initialized`

### 5.3 Test WhatsApp Integration

1. Send `/help` to the WhatsApp group
2. Bot should respond with command list
3. Try `/xp` - should show your XP

### 5.4 Monitor Health

```bash
# From your local machine
curl https://your-tunnel-url/health

# Or from server
curl http://localhost:3001/health
```

---

## Maintenance & Monitoring

### Viewing Logs

**Real-time:**
```bash
docker logs -f wnf-whatsapp-bot
```

**Last 100 lines:**
```bash
docker logs --tail 100 wnf-whatsapp-bot
```

**With timestamps:**
```bash
docker logs -t wnf-whatsapp-bot
```

### Restarting Container

**Portainer:** Containers → `wnf-whatsapp-bot` → Restart

**CLI:**
```bash
docker-compose restart
# or
docker restart wnf-whatsapp-bot
```

### Updating Code

```bash
# Pull latest code
cd ~/wnf-bot
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup WhatsApp Session

**CRITICAL:** If you lose session data, you'll need to re-scan QR code!

```bash
# Create backup
docker run --rm \
  -v bot_whatsapp-sessions:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/whatsapp-sessions-$(date +%Y%m%d).tar.gz -C /data .

# Restore from backup
docker run --rm \
  -v bot_whatsapp-sessions:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/whatsapp-sessions-YYYYMMDD.tar.gz"
```

### Resource Monitoring

**Portainer Stats:**
- Containers → `wnf-whatsapp-bot` → Stats
- Shows real-time CPU, memory, network usage

**CLI:**
```bash
# Container stats
docker stats wnf-whatsapp-bot

# Detailed info
docker inspect wnf-whatsapp-bot
```

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs wnf-whatsapp-bot
```

**Common issues:**
- Missing environment variables → check `.env` file
- Port 3001 already in use → change port in `docker-compose.yml`
- Can't connect to Supabase → check `SUPABASE_URL` and service role key

### WhatsApp Session Expired

**Symptoms:** Bot logs show authentication errors

**Solution:**
```bash
# Remove session volume
docker-compose down
docker volume rm bot_whatsapp-sessions

# Restart and re-scan QR code
docker-compose up -d
docker logs -f wnf-whatsapp-bot
```

### Cloudflare Tunnel Not Working

**Check tunnel status:**
```bash
sudo systemctl status cloudflared
```

**View tunnel logs:**
```bash
sudo journalctl -u cloudflared -f
```

**Restart tunnel:**
```bash
sudo systemctl restart cloudflared
```

**Test local bot first:**
```bash
curl http://localhost:3001/health
# If this works, issue is with tunnel
# If this fails, issue is with bot
```

### Bot Not Responding in WhatsApp

**Checks:**
1. Is container running? `docker ps`
2. Is WhatsApp connected? Check logs for "ready"
3. Is group ID correct? Send message and check logs
4. Is bot receiving messages? Check logs for "Message received"

**Debug:**
```bash
# Send test message to group
# Then check logs immediately
docker logs --tail 20 -f wnf-whatsapp-bot
```

---

## Security Considerations

### Firewall Rules

No inbound ports needed! Cloudflare Tunnel uses outbound connections only.

**Optional - restrict Docker access:**
```bash
# Block external access to port 3001 (only allow localhost + tunnel)
sudo ufw deny 3001/tcp
sudo ufw allow from 127.0.0.1 to any port 3001
```

### Secure Environment Variables

```bash
# Set proper file permissions
chmod 600 ~/wnf-bot/.env

# Never commit .env to git
# It's already in .gitignore
```

### Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd ~/wnf-bot
docker-compose pull
docker-compose up -d
```

---

## Backup Strategy

### What to Backup

1. **WhatsApp Sessions** (CRITICAL)
2. Environment variables (`.env`)
3. Docker compose configuration
4. Bot source code (if modified)

### Automated Backup Script

```bash
#!/bin/bash
# ~/backup-wnf-bot.sh

BACKUP_DIR=~/wnf-bot-backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup WhatsApp sessions
docker run --rm \
  -v bot_whatsapp-sessions:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/sessions_$DATE.tar.gz -C /data .

# Backup config files
tar czf $BACKUP_DIR/config_$DATE.tar.gz -C ~/wnf-bot .env docker-compose.yml

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t sessions_*.tar.gz | tail -n +8 | xargs rm -f
ls -t config_*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: $DATE"
```

**Make executable and run:**
```bash
chmod +x ~/backup-wnf-bot.sh
./backup-wnf-bot.sh
```

**Schedule via cron (daily at 2 AM):**
```bash
crontab -e
# Add line:
0 2 * * * ~/backup-wnf-bot.sh >> ~/wnf-bot-backups/backup.log 2>&1
```

---

## Performance Tuning

### Resource Limits

Edit `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Increase if needed
      memory: 2G       # Increase if needed
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Log Rotation

Docker automatically rotates logs with config in `docker-compose.yml`:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # Max log file size
    max-file: "3"      # Keep 3 log files
```

---

## Next Steps

Once bot is running:

1. ✅ **Test commands** in WhatsApp group
2. ✅ **Set up Supabase database migrations** (see Phase 1 in main docs)
3. ✅ **Add WhatsApp phone linking** to web app
4. ✅ **Configure automated announcements** (Phase 3)
5. ✅ **Create admin monitoring page** (Phase 5)

**See:** `/docs/features/WhatsAppBotIntegration.md` for full roadmap

---

## Support

- **Main Documentation:** `/docs/features/WhatsAppBotIntegration.md`
- **Bot README:** `/bot/README.md`
- **Issues:** GitHub Issues

---

**Last Updated:** 2025-10-10
**Status:** Ready for deployment
