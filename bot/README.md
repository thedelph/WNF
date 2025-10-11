# WNF WhatsApp Bot

WhatsApp bot for automating game registration, announcements, and player interactions for Wednesday Night Football.

## Features

- 🤖 **Automated Registration**: React with 👍 to register for games
- 💬 **Interactive Commands**: Check XP, stats, tokens via WhatsApp
- 🪙 **Token Management**: Use priority and shield tokens via WhatsApp
- 📢 **Auto Announcements**: Game announcements, player selections, team assignments
- 📊 **Admin Dashboard**: Monitor bot health and interactions

## Architecture

- **Bot Service**: Node.js + TypeScript + whatsapp-web.js
- **Database**: Supabase (PostgreSQL)
- **Web App**: React (hosted on Vercel)
- **Deployment**: Docker container on Proxmox/Portainer
- **Webhook**: Cloudflare Tunnel (secure, no port forwarding)

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for production)
- Supabase account and project
- Secondary phone number for WhatsApp
- Cloudflare account (free tier)

### Local Development

1. **Install dependencies:**
   ```bash
   cd bot
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Scan QR code** that appears in terminal with your secondary WhatsApp account

### Docker Deployment (Home Server)

#### Method 1: Using Portainer (Recommended)

1. **Copy files to your home server:**
   ```bash
   # From your development machine
   scp -r bot/ user@your-server:/path/to/deployment/
   ```

2. **In Portainer UI:**
   - Navigate to "Stacks" → "Add Stack"
   - Name it `wnf-whatsapp-bot`
   - Upload `docker-compose.yml`
   - Add environment variables in the UI
   - Click "Deploy the stack"

3. **View logs:**
   - Go to "Containers" → `wnf-whatsapp-bot`
   - Click "Logs" to see QR code for authentication

#### Method 2: Command Line

1. **Build and run:**
   ```bash
   cd bot
   docker-compose up -d
   ```

2. **View logs (to scan QR code):**
   ```bash
   docker-compose logs -f
   ```

3. **Once authenticated, the session is persisted in the volume**

### Cloudflare Tunnel Setup

Exposes your bot's webhook endpoint securely (free, no port forwarding needed).

1. **Install cloudflared on your server:**
   ```bash
   # For Debian/Ubuntu
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. **Authenticate:**
   ```bash
   cloudflared tunnel login
   ```

3. **Create tunnel:**
   ```bash
   cloudflared tunnel create wnf-whatsapp-bot
   ```

4. **Create config file** (`~/.cloudflared/config.yml`):
   ```yaml
   url: http://localhost:3001
   tunnel: <TUNNEL_ID>
   credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
   ```

5. **Run tunnel:**
   ```bash
   cloudflared tunnel run wnf-whatsapp-bot
   ```

6. **Get tunnel URL:**
   ```bash
   cloudflared tunnel info wnf-whatsapp-bot
   ```

7. **Update Supabase Edge Function** with tunnel URL:
   ```typescript
   const BOT_WEBHOOK_URL = 'https://wnf-bot.your-tunnel.trycloudflare.com';
   ```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WA_SESSION_PATH` | Path to WhatsApp session data | `./sessions` |
| `WA_GROUP_ID` | WhatsApp group chat ID | `120363...@g.us` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (NOT anon key) | `eyJhbGc...` |
| `WEBHOOK_SECRET` | Random secret for webhook auth | `generate-random-32-char` |
| `ADMIN_PHONE_NUMBERS` | Admin phone numbers (comma-separated) | `+447123456789,+447987654321` |
| `NODE_ENV` | Environment | `production` |
| `LOG_LEVEL` | Log level | `info` |
| `PORT` | HTTP server port | `3001` |

## Project Structure

```
bot/
├── src/
│   ├── index.ts                 # Entry point
│   ├── whatsapp-client.ts       # WhatsApp connection
│   ├── supabase-client.ts       # Supabase integration
│   ├── config.ts                # Configuration
│   ├── server.ts                # HTTP server for webhooks
│   ├── handlers/
│   │   ├── reaction-handler.ts  # 👍 registration
│   │   ├── command-handler.ts   # /xp, /stats commands
│   │   └── message-handler.ts   # General messages
│   ├── services/
│   │   ├── registration.service.ts
│   │   ├── stats.service.ts
│   │   └── announcement.service.ts
│   └── utils/
│       ├── logger.ts
│       ├── message-formatter.ts
│       └── player-matcher.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Available Commands

### Player Commands (in WhatsApp)

- `/xp` - Check your XP
- `/stats` - View full stats
- `/tokens` - Priority token status
- `/shields` - Shield token status
- `/nextgame` - Next game information
- `/winrate` - Win/loss record
- `/help` - List all commands

### Quick Actions

- 👍 - Register for a game
- 🪙 (with 👍) - Use priority token
- 🛡️ - Use shield token

### Admin Commands

- `/admin register @player` - Manually register player
- `/admin unregister @player` - Remove registration
- `/admin token @player` - Grant priority token
- `/admin shield @player` - Grant shield token

## Docker Commands

```bash
# Build image
npm run docker:build

# Start container
npm run docker:run

# Stop container
npm run docker:stop

# View logs
npm run docker:logs

# Restart container
npm run docker:restart

# Or use docker-compose directly
docker-compose up -d          # Start
docker-compose down           # Stop
docker-compose logs -f        # Follow logs
docker-compose restart        # Restart
docker-compose ps             # Status
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "whatsappReady": true,
  "timestamp": "2025-10-10T15:30:00.000Z"
}
```

### Logs

**Docker logs:**
```bash
docker logs wnf-whatsapp-bot -f
```

**Log files (inside container):**
```
/app/logs/combined.log  # All logs
/app/logs/error.log     # Errors only
```

### Portainer Monitoring

- Container status: Portainer → Containers → `wnf-whatsapp-bot`
- Real-time stats: CPU, memory, network usage
- Logs: Built-in log viewer
- Console: Exec into container if needed

## Troubleshooting

### QR Code Not Appearing

**Solution:**
```bash
# View logs to see QR code
docker logs wnf-whatsapp-bot
```

### WhatsApp Session Expired

**Solution:**
1. Stop container
2. Remove session volume: `docker volume rm bot_whatsapp-sessions`
3. Start container and scan QR code again

### Bot Not Receiving Messages

**Symptoms:** Messages sent to WhatsApp group don't trigger bot

**Checks:**
1. Is container running? `docker ps`
2. Is WhatsApp connected? Check logs
3. Is group ID correct? Compare with actual group chat ID

**Get Group ID:**
Send any message to group, check logs for chat ID.

### Webhook Not Working

**Symptoms:** Supabase edge function can't reach bot

**Checks:**
1. Is Cloudflare Tunnel running? `cloudflared tunnel info`
2. Is bot HTTP server listening? Check health endpoint
3. Is webhook secret matching in both places?

**Test webhook manually:**
```bash
curl -X POST https://your-tunnel-url/send \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"gameId":"test","announcementType":"announcement"}'
```

### Container Keeps Restarting

**Solution:**
```bash
# Check container logs
docker logs wnf-whatsapp-bot --tail 100

# Common issues:
# - Missing environment variables
# - Can't connect to Supabase
# - Chromium dependencies missing (rebuild with Dockerfile)
```

### High Memory Usage

**Normal:** ~500MB-1GB (Chromium + Node.js)

**If exceeding 1.5GB:**
1. Check for memory leaks in logs
2. Restart container: `docker-compose restart`
3. Adjust memory limits in `docker-compose.yml`

## Security Notes

⚠️ **NEVER commit these files:**
- `.env` - Contains secrets
- `sessions/` - WhatsApp authentication data
- Any files with service role keys

✅ **Best practices:**
- Use service role key (not anon key) for Supabase
- Generate strong random webhook secret
- Keep WhatsApp session files in persistent volume only
- Regularly update dependencies
- Monitor logs for unauthorized access

## Updates & Maintenance

### Updating Dependencies

```bash
# Update package.json versions
npm update

# Rebuild Docker image
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup WhatsApp Session

**CRITICAL**: Back up session data to avoid re-authentication

```bash
# Create backup
docker run --rm -v bot_whatsapp-sessions:/data -v $(pwd):/backup alpine \
  tar czf /backup/whatsapp-sessions-backup.tar.gz -C /data .

# Restore from backup
docker run --rm -v bot_whatsapp-sessions:/data -v $(pwd):/backup alpine \
  sh -c "cd /data && tar xzf /backup/whatsapp-sessions-backup.tar.gz"
```

## Support

- **Documentation**: See `/docs/features/WhatsAppBotIntegration.md`
- **Issues**: Create GitHub issue
- **Logs**: Always include relevant logs when reporting issues

## License

MIT
