# WhatsApp Bot Deployment Context - For Ubuntu Server

**Document Purpose:** Complete context for deploying WNF WhatsApp bot on Ubuntu server via SSH
**Last Updated:** 2025-10-10
**Status:** Code ready, awaiting deployment
**User Location:** Working via SSH on Ubuntu server with Docker + Portainer

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [What We're Building](#what-were-building)
3. [Current State](#current-state)
4. [Architecture](#architecture)
5. [File Structure](#file-structure)
6. [Deployment Instructions](#deployment-instructions)
7. [Environment Configuration](#environment-configuration)
8. [Verification Steps](#verification-steps)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)
11. [Important Context](#important-context)

---

## Project Overview

### What is WNF?
**Wednesday Night Football (WNF)** is a weekly football (soccer) game management system with:
- React web app (hosted on Vercel) at https://wnf.app
- Supabase backend (PostgreSQL + Edge Functions)
- WhatsApp group for player communication (~40 members)
- Players register via web app OR WhatsApp reactions (currently manual)

### Current Pain Point
Admin manually registers players who react with 👍 to game announcements in WhatsApp. This is time-consuming and creates delays.

### The Solution
A **WhatsApp bot** that:
- Auto-registers players who react with 👍
- Responds to commands (`/xp`, `/stats`, `/tokens`, `/shields`)
- Sends automated game announcements
- Allows token usage via WhatsApp (priority 🪙 and shield 🛡️ tokens)

---

## What We're Building

### Technology Stack
- **Runtime:** Node.js 18+ with TypeScript
- **WhatsApp Integration:** whatsapp-web.js (https://docs.wwebjs.dev/)
  - Uses Puppeteer to connect via WhatsApp Web
  - Requires QR code scan for authentication
  - Persistent session storage
- **Database:** Supabase (PostgreSQL)
  - Existing database with players, games, registrations tables
  - RPC functions for registration logic
- **Deployment:** Docker container on Ubuntu server (Proxmox VM)
  - Managed via Portainer UI
  - Persistent volumes for WhatsApp sessions
- **Webhooks:** Cloudflare Tunnel (to be set up in Phase 3)
  - Allows Supabase Edge Functions to call bot
  - No port forwarding needed

### What's Implemented (Phase 1)
✅ WhatsApp client with QR authentication
✅ Supabase database integration
✅ HTTP server with health check endpoint
✅ Docker containerization
✅ Comprehensive logging (Winston)
✅ Environment configuration
✅ Error handling and graceful shutdown

### What's NOT Implemented Yet
❌ Command handlers (`/xp`, `/stats`, etc.) - Phase 2
❌ Reaction-based registration (👍) - Phase 2
❌ Token usage via WhatsApp - Phase 2
❌ Automated announcements - Phase 3
❌ Admin commands - Phase 4
❌ Cloudflare Tunnel setup - Phase 3

**Current Goal:** Get Phase 1 deployed and authenticated

---

## Current State

### What's Been Done
1. ✅ Complete TypeScript bot code written
2. ✅ Dockerfile and docker-compose.yml created
3. ✅ Documentation written (README, DEPLOY, HOME_SERVER_DEPLOYMENT)
4. ✅ Files copied to Ubuntu server at `~/bot/`
5. ⏳ **Currently at:** Need to build Docker image and start container

### What's Needed
1. Build Docker image on server
2. Configure environment variables (.env file)
3. Start container with docker-compose
4. Verify health endpoint responds
5. Wait for SIM card to arrive (tomorrow)
6. Scan QR code to authenticate WhatsApp
7. Get WhatsApp group ID from logs
8. Update WA_GROUP_ID environment variable

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────┐
│    Ubuntu Server (Proxmox VM)                       │
│    IP: [user's server IP]                           │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  Docker Container: wnf-whatsapp-bot        │   │
│  │  ┌──────────────────────────────────────┐ │   │
│  │  │  Node.js 18 + TypeScript             │ │   │
│  │  │  • WhatsApp Web.js (Puppeteer)       │ │   │
│  │  │  • Express HTTP server (port 3001)   │ │   │
│  │  │  • Winston logging                    │ │   │
│  │  │  • Supabase client                    │ │   │
│  │  └──────────────────────────────────────┘ │   │
│  │                                            │   │
│  │  Volumes (persistent):                     │   │
│  │  • /app/sessions → WhatsApp auth data     │   │
│  │  • /app/logs → Log files                  │   │
│  └────────────────────────────────────────────┘   │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTPS connection
                   ▼
┌──────────────────────────────────────────────────────┐
│            Cloud Services                            │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  Supabase (PostgreSQL + Edge Functions)    │   │
│  │  • Players table (whatsapp_mobile_number)  │   │
│  │  • Games table                              │   │
│  │  • Game registrations table                │   │
│  │  • RPC functions (use_player_token, etc.)  │   │
│  └────────────────────────────────────────────┘   │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  Vercel (React Web App)                    │   │
│  │  • https://wnf.app                         │   │
│  │  • Player profiles, game management        │   │
│  └────────────────────────────────────────────┘   │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  WhatsApp Web                              │   │
│  │  • Bot connects as linked device           │   │
│  │  • Monitors group messages/reactions       │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Data Flow

**Player Registration Flow (Future - Phase 2):**
```
1. Game announcement posted to WhatsApp group by admin
2. Player reacts with 👍
3. Bot detects reaction
4. Bot queries Supabase to find player by WhatsApp phone
5. Bot calls Supabase RPC: use_player_token() or registers directly
6. Bot confirms registration in WhatsApp
7. Player sees confirmation message
```

**Health Check Flow (Current - Phase 1):**
```
1. External service calls: GET http://server-ip:3001/health
2. Bot responds with status JSON
3. Includes: bot status, WhatsApp ready state, uptime
```

---

## File Structure

### Directory Layout
```
~/bot/                                    # Root directory on server
├── src/                                  # TypeScript source code
│   ├── index.ts                         # Main entry point
│   ├── config.ts                        # Environment configuration
│   ├── whatsapp-client.ts               # WhatsApp Web.js integration
│   ├── supabase-client.ts               # Supabase database client
│   ├── server.ts                        # Express HTTP server
│   ├── handlers/                        # Message/command handlers (Phase 2)
│   ├── services/                        # Business logic services (Phase 2)
│   └── utils/
│       ├── logger.ts                    # Winston logging setup
│       └── phone-formatter.ts           # Phone number utilities
├── sessions/                            # WhatsApp auth (created by Docker)
├── logs/                                # Log files (created by Docker)
├── Dockerfile                           # Docker build instructions
├── docker-compose.yml                   # Container orchestration
├── docker-compose.portainer.yml         # Alternative for Portainer stacks
├── package.json                         # Node.js dependencies
├── tsconfig.json                        # TypeScript configuration
├── .env.example                         # Environment template
├── .env                                 # Actual environment (CREATE THIS!)
├── .gitignore                           # Git ignore rules
├── README.md                            # Complete documentation
├── DEPLOY.md                            # Quick deployment guide
├── HOME_SERVER_DEPLOYMENT.md            # Detailed server guide
├── QUICK_FIX.md                         # Portainer error fixes
└── DEPLOYMENT_CONTEXT.md                # THIS FILE
```

### Key Files Explained

**src/index.ts**
- Main application entry point
- Initializes WhatsApp client and HTTP server
- Handles graceful shutdown
- Logs startup information

**src/whatsapp-client.ts**
- Wraps whatsapp-web.js Client
- Handles QR code authentication
- Listens for messages and reactions
- Manages connection state
- Currently logs events (handlers in Phase 2)

**src/supabase-client.ts**
- Singleton Supabase client
- Uses service role key (full access)
- Helper methods:
  - `findPlayerByPhone()` - Match WhatsApp number to player
  - `registerPlayer()` - Create game registration
  - `getPlayerStats()` - Fetch player data
  - `getTokenStatus()` - Check priority tokens
  - `getShieldStatus()` - Check shield tokens

**src/server.ts**
- Express HTTP server on port 3001
- Endpoints:
  - `GET /health` - Health check (no auth)
  - `POST /send` - Webhook for announcements (requires auth)
- Webhook authentication via Bearer token
- JSON request/response

**src/config.ts**
- Loads environment variables via dotenv
- Validates required variables
- Exports typed configuration object
- Throws errors if critical vars missing

**Dockerfile**
- Base: node:18-alpine
- Installs Chromium (for Puppeteer)
- Sets Puppeteer to use system Chromium
- Builds TypeScript to /app/dist
- Runs as non-root user
- Health check configured
- Exposes port 3001

**docker-compose.yml**
- Defines wnf-whatsapp-bot service
- Maps environment variables
- Creates persistent volumes:
  - `whatsapp-sessions` - CRITICAL for auth persistence
  - `whatsapp-logs` - Log files
- Port mapping: 3001:3001
- Resource limits: 1 CPU, 1GB RAM
- Health check every 30s
- Restart policy: unless-stopped

---

## Deployment Instructions

### Prerequisites Checklist
- [ ] Ubuntu server accessible via SSH
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] Portainer running (optional, for UI management)
- [ ] Files copied to `~/bot/` directory
- [ ] Supabase project URL and service role key available

### Step-by-Step Deployment

#### Step 1: Verify Files Are Present

```bash
# SSH into Ubuntu server
ssh user@server-ip

# Navigate to bot directory
cd ~/bot

# List files
ls -la

# Expected output should include:
# - src/ directory
# - Dockerfile
# - docker-compose.yml
# - package.json
# - tsconfig.json
# - .env.example
```

If files are missing, copy them:
```bash
# From Windows machine
scp -r C:\Users\chris\documents\github\wnf\bot user@server-ip:~/
```

#### Step 2: Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit environment file
nano .env
```

**Fill in these values** (see Environment Configuration section below for details):

```env
# Supabase (REQUIRED - get from dashboard)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Webhook secret (REQUIRED - generate random)
WEBHOOK_SECRET=<run: openssl rand -hex 32>

# WhatsApp (leave empty for now)
WA_GROUP_ID=

# Admin phone (your UK number)
ADMIN_PHONE_NUMBERS=+447123456789

# Other settings (defaults are fine)
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
WA_SESSION_PATH=/app/sessions
```

**Save and exit:** Ctrl+X, then Y, then Enter

**Generate webhook secret:**
```bash
openssl rand -hex 32
# Copy output and paste into .env as WEBHOOK_SECRET value
```

#### Step 3: Build Docker Image

```bash
# Build the image (takes 2-3 minutes first time)
docker build -t wnf-whatsapp-bot .

# You'll see output like:
# [1/5] FROM docker.io/library/node:18-alpine
# [2/5] RUN apk add --no-cache chromium...
# [3/5] WORKDIR /app
# [4/5] COPY package*.json ./
# [5/5] RUN npm ci --only=production
# Successfully built abc123def456
# Successfully tagged wnf-whatsapp-bot:latest

# Verify image exists
docker images | grep wnf
# Should show: wnf-whatsapp-bot latest ...
```

#### Step 4: Start Container

```bash
# Start container in detached mode
docker-compose up -d

# Output should be:
# Creating network "bot_wnf-network" ... done
# Creating volume "bot_whatsapp-sessions" ... done
# Creating volume "bot_whatsapp-logs" ... done
# Creating wnf-whatsapp-bot ... done
```

#### Step 5: Check Container Status

```bash
# List running containers
docker ps

# Should show:
# CONTAINER ID   IMAGE                 ... STATUS                    PORTS
# abc123def456   wnf-whatsapp-bot     ... Up 10 seconds (healthy)   0.0.0.0:3001->3001/tcp
```

**Status meanings:**
- `Up X seconds` - Container is running
- `(healthy)` - Health check passed (appears after ~40 seconds)
- `(unhealthy)` - Health check failed - check logs!
- `Restarting` - Container keeps crashing - check logs!

#### Step 6: View Logs

```bash
# View live logs (press Ctrl+C to exit)
docker logs -f wnf-whatsapp-bot

# Expected output:
# 2025-10-10 16:00:00 [info]: 🚀 Starting WNF WhatsApp Bot...
# 2025-10-10 16:00:00 [info]: 📍 Environment: production
# 2025-10-10 16:00:00 [info]: 📝 Log Level: info
# 2025-10-10 16:00:00 [info]: 🔌 Port: 3001
# 2025-10-10 16:00:00 [info]: 🔄 Initializing WhatsApp client...
# 2025-10-10 16:00:00 [info]: Initializing WhatsApp client...
# 2025-10-10 16:00:05 [info]: ✅ Supabase client initialized
# 2025-10-10 16:00:05 [info]: 🔄 Starting HTTP server...
# 2025-10-10 16:00:05 [info]: 🌐 Bot HTTP server listening on port 3001
# 2025-10-10 16:00:05 [info]: 📊 Health check: http://localhost:3001/health
# 2025-10-10 16:00:05 [info]: ✅ Bot is running successfully!
# 2025-10-10 16:00:10 [info]: 📱 QR Code received! Scan with your WhatsApp:
#
# [ASCII QR code appears here]
#
# 2025-10-10 16:00:10 [info]: Waiting for authentication...
```

**Do NOT scan QR code yet!** Wait for SIM card to arrive tomorrow.

#### Step 7: Test Health Endpoint

```bash
# Test from server
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "ok",
#   "whatsappReady": false,
#   "timestamp": "2025-10-10T16:00:00.000Z",
#   "uptime": 123.45,
#   "nodeEnv": "production"
# }

# Test from local machine (if port accessible)
curl http://server-ip:3001/health
```

**`whatsappReady: false` is normal** until QR code is scanned!

---

## Environment Configuration

### Required Variables

#### SUPABASE_URL
**Where to find:**
1. Go to https://supabase.com/dashboard
2. Select WNF project
3. Settings → API
4. Copy "Project URL"

**Format:** `https://abcdefghijklmnop.supabase.co`

#### SUPABASE_SERVICE_ROLE_KEY
**Where to find:**
1. Same location as SUPABASE_URL
2. Settings → API
3. Copy "service_role" key (NOT "anon" key!)
4. Click "Reveal" if hidden

**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long JWT token)

**CRITICAL:** Use `service_role` key, NOT `anon` key!
- `service_role` = Full database access (bot needs this)
- `anon` = Limited public access (web app uses this)

#### WEBHOOK_SECRET
**Generate random string:**
```bash
openssl rand -hex 32
```

**Purpose:** Authenticates webhook calls from Supabase Edge Functions to bot

**Format:** `a1b2c3d4e5f6...` (64 character hex string)

### Optional Variables

#### WA_GROUP_ID
**Leave empty initially!**

**How to get:**
1. Deploy bot (without this variable)
2. Authenticate WhatsApp tomorrow (scan QR)
3. Send any message to WNF WhatsApp group
4. Check bot logs: `docker logs wnf-whatsapp-bot`
5. Look for: `Message received: { from: '120363...@g.us' }`
6. Copy that ID (format: `12036xxxxxxxxx@g.us`)
7. Update environment variable
8. Restart container

**Format:** `120363123456789012@g.us`

#### ADMIN_PHONE_NUMBERS
**Your UK phone number in E.164 format**

**Format:** `+447123456789` (no spaces, no dashes)

**Multiple admins:** Comma-separated: `+447123456789,+447987654321`

**Purpose:** Bot recognizes these numbers as admins (for future admin commands)

### Default Variables (Usually Don't Change)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Runtime environment |
| `LOG_LEVEL` | `info` | Logging verbosity (debug/info/warn/error) |
| `PORT` | `3001` | HTTP server port |
| `WA_SESSION_PATH` | `/app/sessions` | WhatsApp session storage path |

### Complete .env Template

```env
# WhatsApp Configuration
WA_SESSION_PATH=/app/sessions
WA_GROUP_ID=                             # Leave empty initially

# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Get from Supabase dashboard

# Bot Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Webhook Authentication (REQUIRED)
WEBHOOK_SECRET=                           # Generate: openssl rand -hex 32

# Admin Phone Numbers (Optional)
ADMIN_PHONE_NUMBERS=+447123456789
```

---

## Verification Steps

### 1. Container Running
```bash
docker ps | grep wnf
# Should show: wnf-whatsapp-bot ... Up X minutes ... (healthy)
```

### 2. Health Check Responding
```bash
curl http://localhost:3001/health | jq
# Should return JSON with "status": "ok"
```

### 3. Logs Look Good
```bash
docker logs --tail 50 wnf-whatsapp-bot
# Should see:
# - ✅ Bot is running successfully!
# - ✅ Supabase client initialized
# - 🌐 Bot HTTP server listening on port 3001
# - 📱 QR Code received (appears repeatedly)
```

### 4. Supabase Connection Working
```bash
# Check logs for Supabase errors
docker logs wnf-whatsapp-bot 2>&1 | grep -i "supabase"
# Should see: "✅ Supabase client initialized"
# Should NOT see: "Error", "Failed", "Connection refused"
```

### 5. No Critical Errors
```bash
# Check for errors
docker logs wnf-whatsapp-bot 2>&1 | grep -i "error"
# Should see very few or no errors
```

### 6. Volumes Created
```bash
docker volume ls | grep whatsapp
# Should show:
# bot_whatsapp-sessions
# bot_whatsapp-logs
```

### 7. Port Accessible
```bash
# From server
netstat -tulpn | grep 3001
# Should show: tcp ... 0.0.0.0:3001 ... LISTEN

# From local machine (if firewall allows)
curl http://server-ip:3001/health
```

---

## Troubleshooting

### Container Won't Start

**Symptom:** `docker ps` shows no wnf-whatsapp-bot container

**Diagnosis:**
```bash
# Check all containers (including stopped)
docker ps -a | grep wnf

# Check recent logs
docker logs wnf-whatsapp-bot
```

**Common causes:**
1. **Missing environment variables**
   ```
   Error: Missing required environment variables: SUPABASE_URL
   ```
   Fix: Edit `.env` file, add missing variables

2. **Port already in use**
   ```
   Error: bind: address already in use
   ```
   Fix: Change PORT in .env to 3002, update docker-compose.yml ports section

3. **Can't connect to Supabase**
   ```
   Error: fetch failed ... ECONNREFUSED
   ```
   Fix: Check SUPABASE_URL is correct, test: `curl https://YOUR_PROJECT.supabase.co`

### Container Keeps Restarting

**Symptom:** Container status shows "Restarting (1) X seconds ago"

**Diagnosis:**
```bash
# View last 100 log lines
docker logs --tail 100 wnf-whatsapp-bot
```

**Common causes:**
1. **Chromium installation failed**
   ```
   Error: Failed to launch the browser process
   ```
   Fix: Rebuild with `--no-cache`: `docker-compose build --no-cache`

2. **Out of memory**
   ```
   JavaScript heap out of memory
   ```
   Fix: Increase memory limit in docker-compose.yml (limits.memory)

3. **TypeScript build failed**
   ```
   Error: Cannot find module
   ```
   Fix: Rebuild: `docker-compose down && docker-compose build --no-cache && docker-compose up -d`

### Health Check Fails

**Symptom:** Container shows "(unhealthy)" status

**Diagnosis:**
```bash
# Test health endpoint manually
curl http://localhost:3001/health

# Check if port is listening
netstat -tulpn | grep 3001
```

**Common causes:**
1. **Server not starting**
   Check logs for errors in server.ts startup

2. **Wrong port**
   Ensure PORT env var matches docker-compose.yml ports section

3. **Health check too aggressive**
   Wait 60 seconds - initial startup takes time

### Can't See QR Code

**Symptom:** Logs don't show QR code

**Diagnosis:**
```bash
# View live logs
docker logs -f wnf-whatsapp-bot

# Wait for this line:
# "📱 QR Code received! Scan with your WhatsApp:"
```

**Common causes:**
1. **Chromium not installed**
   Check logs for Puppeteer errors, rebuild if needed

2. **Session already exists**
   Old session files preventing QR generation
   Fix: Delete session volume:
   ```bash
   docker-compose down
   docker volume rm bot_whatsapp-sessions
   docker-compose up -d
   ```

3. **WhatsApp Web service issues**
   Wait and try again, check WhatsApp Web status online

### Supabase Connection Errors

**Symptom:** Logs show "Error connecting to Supabase" or similar

**Diagnosis:**
```bash
# Test Supabase URL from server
curl https://YOUR_PROJECT.supabase.co/rest/v1/

# Should return 401 Unauthorized (that's OK, means it's reachable)
# Should NOT return: connection refused, timeout, DNS error
```

**Common causes:**
1. **Wrong URL**
   Double-check SUPABASE_URL in .env

2. **Wrong service role key**
   Verify you copied `service_role` key, not `anon` key

3. **Network/firewall issue**
   Check server can reach internet: `ping 8.8.8.8`

### Logs Filling Up Disk

**Symptom:** Server running out of disk space

**Solution:**
```bash
# Check Docker disk usage
docker system df

# Clean up old logs
docker exec wnf-whatsapp-bot sh -c 'rm /app/logs/*.log'

# Or configure log rotation (already set in docker-compose.yml):
# max-size: "10m"
# max-file: "3"
```

---

## Next Steps

### Tomorrow: When SIM Card Arrives

#### 1. Activate SIM Card
- Put SIM in phone or mobile hotspot
- Verify you can receive SMS
- Note the phone number

#### 2. Open WhatsApp
- Install WhatsApp on device with SIM
- Verify phone number via SMS
- Complete WhatsApp setup

#### 3. View QR Code
```bash
# SSH into server
docker logs -f wnf-whatsapp-bot

# You'll see ASCII QR code in terminal
# Keep this terminal open
```

#### 4. Scan QR Code
- Open WhatsApp on phone
- Settings → Linked Devices → Link a Device
- Scan QR code from terminal
- Wait for confirmation

#### 5. Verify Authentication
Logs should show:
```
✅ WhatsApp client authenticated successfully
✅ WhatsApp client is ready!
```

Health check should now show:
```json
{
  "whatsappReady": true
}
```

#### 6. Get WhatsApp Group ID
- Send any message to WNF WhatsApp group
- Check logs immediately:
```bash
docker logs -f wnf-whatsapp-bot
```
- Look for:
```
Message received: { from: '120363...@g.us', ... }
```
- Copy that ID (format: `12036xxxxxxxxx@g.us`)

#### 7. Update Environment
```bash
# Edit .env
nano ~/bot/.env

# Set WA_GROUP_ID to the ID from step 6
WA_GROUP_ID=120363123456789012@g.us

# Save: Ctrl+X, Y, Enter

# Restart container to pick up new env var
docker-compose restart

# Verify
docker logs --tail 20 wnf-whatsapp-bot
```

#### 8. Test Bot
Send to WhatsApp group:
```
/help
```

Bot should respond (even though commands aren't fully implemented, it should acknowledge).

Check logs:
```bash
docker logs -f wnf-whatsapp-bot
# Should see: "Message received: { from: '12036...@g.us', body: '/help' }"
```

### After Authentication: Phase 2 Implementation

Once bot is authenticated and responding:

1. **WhatsApp phone number linking** ✅ READY
   - Database columns exist: `whatsapp_mobile_number` and `whatsapp_group_member`
   - 25 of 67 players already have phone numbers stored (E.164 format)
   - Web app already has UI for this (data exists in production)

2. **Implement command handlers**
   - `/xp` - Show player XP
   - `/stats` - Show full stats
   - `/tokens` - Show priority token status
   - `/shields` - Show shield token status
   - `/help` - List commands

3. **Implement reaction handling**
   - Detect 👍 reactions on game announcements
   - Auto-register players
   - Send confirmation messages

4. **Set up Cloudflare Tunnel**
   - Install cloudflared on server
   - Create tunnel for webhook endpoint
   - Update Supabase Edge Function with tunnel URL

5. **Test end-to-end flows**
   - Manual registration via web app
   - Auto registration via WhatsApp 👍
   - Command queries
   - Token usage

---

## Important Context

### WNF System Overview

**Players Table:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Links to Supabase auth
- `friendly_name` (TEXT) - Display name
- `whatsapp_mobile_number` (TEXT) - Phone number (E.164 format) ✅ EXISTS
- `whatsapp_group_member` (TEXT) - "Yes"/"No" flag ✅ EXISTS
- `xp` (INTEGER) - Experience points
- `caps` (INTEGER) - Games played
- `current_streak` (INTEGER) - Consecutive games streak
- `shield_tokens_available` (INTEGER) - Shield tokens (0-4)
- `priority_token` status - Tracked in separate table

**Games Table:**
- `id` (UUID)
- `date` (TIMESTAMP)
- `status` (TEXT) - 'open', 'upcoming', 'players_announced', 'teams_announced', 'completed'
- `max_players` (INTEGER) - Usually 18
- `registration_window_start` (TIMESTAMP)
- `registration_window_end` (TIMESTAMP)

**Game Registrations Table:**
- `id` (UUID)
- `game_id` (UUID) - Foreign key to games
- `player_id` (UUID) - Foreign key to players
- `status` (TEXT) - 'registered', 'selected', 'reserve', 'dropped_out'
- `using_token` (BOOLEAN) - If using priority token
- `team` (TEXT) - 'blue' or 'orange' (after team selection)

**Token Systems:**

1. **Priority Tokens (🪙)**
   - Guaranteed slot in game
   - Earned by missing 3 consecutive games
   - One token at a time
   - Used during registration

2. **Shield Tokens (🛡️)**
   - Protect streak when can't play
   - Earn 1 per 10 games played
   - Max 4 shields
   - Freeze streak at current value
   - Must use INSTEAD of registering

### Supabase RPC Functions Used

**use_player_token(p_player_id, p_game_id)**
- Marks priority token as used
- Returns success/failure

**use_shield_token(p_player_id, p_game_id, p_user_id)**
- Uses shield token
- Freezes current streak
- Cancels registration if already registered
- Returns success/failure

**check_player_token(p_player_id)**
- Checks if player has available priority token
- Returns boolean

**check_shield_eligibility(p_player_id, p_game_id)**
- Checks if player can use shield
- Returns eligibility info

### Phone Number Format

**Storage format:** E.164
- Example: `+447123456789`
- Format: `+[country code][number]`
- No spaces, no dashes

**WhatsApp ID format:**
- Example: `447123456789@c.us`
- Format: `[number without +]@c.us`

**Conversion handled by:** `src/utils/phone-formatter.ts`

### Session Persistence

**CRITICAL:** WhatsApp session data stored in Docker volume `bot_whatsapp-sessions`

**If you lose this volume:**
- Bot will need to re-authenticate
- Must scan QR code again
- No data loss, just inconvenience

**Backup session:**
```bash
# Create backup
docker run --rm -v bot_whatsapp-sessions:/data -v $(pwd):/backup alpine \
  tar czf /backup/whatsapp-sessions-backup.tar.gz -C /data .

# Restore from backup
docker run --rm -v bot_whatsapp-sessions:/data -v $(pwd):/backup alpine \
  sh -c "cd /data && tar xzf /backup/whatsapp-sessions-backup.tar.gz"
```

### Security Notes

**Never commit:**
- `.env` file (contains secrets)
- `sessions/` directory (WhatsApp auth)
- `logs/` directory (may contain sensitive data)

**Service role key:**
- Has full database access
- Keep secure
- Don't share in logs or screenshots
- Rotate if exposed

**Webhook secret:**
- Authenticates Supabase → Bot calls
- Generate random (32+ chars)
- Match in both .env and Supabase Edge Function

---

## Reference Documents

All documentation is in the `~/bot/` directory:

| File | Purpose |
|------|---------|
| **README.md** | Complete bot documentation, all features |
| **DEPLOY.md** | Quick deployment guide, step-by-step |
| **HOME_SERVER_DEPLOYMENT.md** | Detailed Proxmox/Portainer setup, Cloudflare Tunnel |
| **QUICK_FIX.md** | Solutions for common Portainer deployment errors |
| **DEPLOYMENT_CONTEXT.md** | THIS FILE - Complete context for deployment |
| **../docs/features/WhatsAppBotIntegration.md** | Master plan, 84 tasks across 5 phases |

---

## Quick Command Reference

### Docker Commands

```bash
# Build image
docker build -t wnf-whatsapp-bot .

# Start container
docker-compose up -d

# Stop container
docker-compose down

# Restart container
docker-compose restart

# View logs (live)
docker logs -f wnf-whatsapp-bot

# View logs (last N lines)
docker logs --tail 50 wnf-whatsapp-bot

# Check container status
docker ps

# Check all containers
docker ps -a

# Remove container and volumes (CAUTION: loses session!)
docker-compose down -v

# Rebuild without cache
docker-compose build --no-cache

# View container stats
docker stats wnf-whatsapp-bot
```

### Debugging Commands

```bash
# Test health endpoint
curl http://localhost:3001/health | jq

# Check port listening
netstat -tulpn | grep 3001

# Check Supabase connectivity
curl https://YOUR_PROJECT.supabase.co

# View environment variables (HIDE SECRETS!)
docker exec wnf-whatsapp-bot env

# Get shell in container
docker exec -it wnf-whatsapp-bot sh

# Check disk usage
docker system df

# View volumes
docker volume ls

# Inspect volume
docker volume inspect bot_whatsapp-sessions
```

### File Operations

```bash
# Edit environment
nano ~/bot/.env

# View environment template
cat ~/bot/.env.example

# Check file permissions
ls -la ~/bot/

# View logs directory contents (from host)
ls -la ~/bot/logs/

# Tail log file directly
tail -f ~/bot/logs/combined.log
```

---

## Summary for Claude Code Instance

**Situation:**
- WhatsApp bot code is complete and ready
- All files are in `~/bot/` directory
- Need to deploy on Ubuntu server via Docker
- User has Portainer UI but can use command line
- SIM card arrives tomorrow for WhatsApp authentication

**Immediate Task:**
1. Verify files are present in ~/bot/
2. Create .env file with Supabase credentials
3. Build Docker image: `docker build -t wnf-whatsapp-bot .`
4. Start container: `docker-compose up -d`
5. Verify health endpoint: `curl http://localhost:3001/health`
6. Check logs for QR code (don't scan yet): `docker logs -f wnf-whatsapp-bot`

**Tomorrow's Task:**
1. Scan QR code with new SIM
2. Get WhatsApp group ID from logs
3. Update WA_GROUP_ID in .env
4. Restart container
5. Test with /help command in WhatsApp group

**Critical Points:**
- Must use `service_role` Supabase key (not `anon`)
- Don't scan QR code until SIM arrives
- WhatsApp session persisted in Docker volume
- Port 3001 must be accessible for health checks
- All commands NOT implemented yet (Phase 2) but bot should log receipt

**Help User:**
- Guide through environment setup
- Troubleshoot any Docker errors
- Verify connectivity to Supabase
- Confirm health endpoint responds
- Explain any log messages

---

**Document End**
**Ready for deployment - all context provided**
**Good luck! 🚀**
