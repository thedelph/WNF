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

**Important:** This project uses whatsapp-web.js **v1.34.1+**. Earlier versions (v1.26.0 and below) have known issues with the `ready` event not firing. If you encounter authentication issues or the bot doesn't receive messages, ensure you're using the latest version.

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
│   ├── whatsapp-client.ts       # WhatsApp connection & admin DM routing
│   ├── supabase-client.ts       # Supabase integration
│   ├── config/
│   │   ├── index.ts             # Main configuration
│   │   └── admin.ts             # Admin phone numbers & access control
│   ├── server.ts                # HTTP server for webhooks
│   ├── handlers/
│   │   ├── reaction-handler.ts  # 👍 registration
│   │   ├── command-handler.ts   # /xp, /stats commands
│   │   ├── message-handler.ts   # General messages
│   │   ├── admin-command-handler.ts  # Admin DM routing
│   │   └── admin/
│   │       ├── help-command.ts       # /adminhelp
│   │       ├── listgames-command.ts  # /listgames
│   │       └── announce-command.ts   # /announce
│   ├── services/
│   │   ├── registration.service.ts
│   │   ├── stats.service.ts
│   │   ├── game-service.ts
│   │   └── announcement.service.ts
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── utils/
│       ├── logger.ts
│       ├── message-formatter.ts
│       └── player-matcher.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
├── GAME_ANNOUNCEMENT_GUIDE.md
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

### Admin Commands (via DM to Bot)

**IMPORTANT:** Admin commands must be sent as a **private message (DM)** to the bot, NOT in the group chat.

- `/adminhelp` - List all admin commands
- `/listgames` - Show upcoming games with position numbers
- `/announce <position>` - Announce a game to the group (e.g., `/announce 1` for first game)

**How to use:**
1. Send the bot a direct message on WhatsApp
2. Use commands to manage games
3. Use list positions (1, 2, 3...) NOT game sequence numbers

**Configured Admin Numbers:**
- Admin phone numbers are configured in the `ADMIN_PHONE_NUMBERS` environment variable (E.164 format)

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

**Common Causes:**

1. **Ready Event Not Firing (Library Version Issue)**
   - **Symptom:** Health check shows `"whatsappReady": false`
   - **Cause:** whatsapp-web.js v1.26.0 and earlier have known ready event issues
   - **Solution:** Upgrade to v1.34.1+
   ```bash
   # Check current version
   npm list whatsapp-web.js

   # Update package.json to "^1.34.1"
   # Rebuild container
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Group ID Not Configured**
   - **Check:** Is `WA_GROUP_ID` set in `.env`?
   - **Get Group ID:** Use browser inspect element on WhatsApp Web, search for `@g.us` in message IDs
   - **Format:** Should be like `120363423276603282@g.us`

3. **WhatsApp Not Connected**
   - **Check logs:** `docker logs wnf-whatsapp-bot`
   - **Look for:** `✅ WhatsApp client is ready!`
   - **If missing:** Re-authenticate by scanning QR code

4. **Debug Logging Disabled**
   - **Set in `.env`:** `LOG_LEVEL=debug`
   - **Restart container** to see message reception in logs

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

## Recent Updates

**Version 2.1 - 2025-10-21**

- ✨ **Admin DM Commands:** Manage games via private messages to bot
  - `/adminhelp` - Show admin commands
  - `/listgames` - List upcoming games
  - `/announce <position>` - Send game announcements to group
- 📅 **Improved Announcement Formatting:**
  - Dates with ordinal suffixes (22nd October, 18th October)
  - 12-hour time format (9:00pm - 10:00pm)
  - Proper deadline formatting
- 🔧 **Database Schema Updates:**
  - Fixed time extraction from timestamp fields
  - Corrected Game type definitions
- 📚 **Documentation:**
  - Added `ADMIN_GUIDE.md` with full admin command documentation
  - Updated `GAME_ANNOUNCEMENT_GUIDE.md` with correct implementation
  - Enhanced deployment guides

**See:** `ADMIN_GUIDE.md` for admin command usage

---

## License

MIT
