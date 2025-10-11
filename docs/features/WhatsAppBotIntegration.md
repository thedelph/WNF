# WhatsApp Bot Integration Plan

**Project**: WNF WhatsApp Group Chat Bot
**Purpose**: Automate game registration, announcements, and player interactions via WhatsApp
**Start Date**: 2025-10-10
**Estimated Duration**: 8-10 weeks
**Status**: Planning Phase

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Task Checklist](#task-checklist)
4. [Phase 1: Foundation](#phase-1-foundation--basic-bot-setup)
5. [Phase 2: Core Functionality](#phase-2-core-functionality)
6. [Phase 3: Automated Announcements](#phase-3-automated-announcements)
7. [Phase 4: Advanced Features](#phase-4-advanced-features)
8. [Phase 5: Reliability & Monitoring](#phase-5-reliability--monitoring)
9. [Security Considerations](#security-considerations)
10. [Deployment Strategy](#deployment-strategy)
11. [Costs & Resources](#costs--resources)
12. [Risks & Mitigations](#risks--mitigations)
13. [Decision Log](#decision-log)
14. [References](#references)

---

## Overview

### Problem Statement
Currently, players register for games via:
1. **Web App**: `src/components/game/GameRegistration.tsx` - manual button click
2. **WhatsApp Reactions**: Admin manually registers players who react with 👍

The manual process is time-consuming and creates delays. Players also cannot easily check their stats, tokens, or other information without logging into the web app.

### Solution
A WhatsApp bot that:
- ✅ Auto-registers players who react with 👍
- ✅ Allows interactive commands (e.g., `/xp`, `/stats`, `/tokens`)
- ✅ Enables token usage via WhatsApp emojis (🪙 for priority, 🛡️ for shield)
- ✅ Sends automated game announcements (registration open, players selected, teams announced)
- ✅ Provides real-time stats and information to players

### Success Metrics
- 📊 **>80%** of registrations via WhatsApp (vs manual web app)
- ⏱️ **>2 hours/week** admin time saved
- ✅ **>99%** bot uptime
- 👥 **>50%** of players using commands

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│              WhatsApp Bot Service                        │
│           (Separate Node.js Process)                     │
│                                                          │
│  ┌──────────────┐         ┌──────────────────────┐     │
│  │ whatsapp-    │◄────────│ Command Handlers     │     │
│  │ web.js       │         │ • /xp, /stats        │     │
│  │ (Puppeteer)  │         │ • /tokens, /shields  │     │
│  └──────────────┘         └──────────────────────┘     │
│         │                                                │
│         │ Events (messages, reactions)                  │
│         ▼                                                │
│  ┌────────────────────────────────────────┐            │
│  │    Event Processing Layer               │            │
│  │  • Reaction Handler (👍 = register)    │            │
│  │  • Message Parser                       │            │
│  │  • Command Router                       │            │
│  └────────────────────────────────────────┘            │
│         │                                                │
└─────────┼────────────────────────────────────────────────┘
          │
          │ REST API / Supabase Client
          ▼
┌─────────────────────────────────────────────────────────┐
│          Supabase Backend (Existing)                     │
│                                                          │
│  ┌──────────────┐    ┌─────────────┐  ┌─────────────┐ │
│  │  PostgreSQL  │    │  Edge       │  │  RPC        │ │
│  │  Database    │◄───│  Functions  │◄─│  Functions  │ │
│  └──────────────┘    └─────────────┘  └─────────────┘ │
│                                                          │
│  Tables: games, players, game_registrations,            │
│          player_tokens, shield_token_usage              │
└─────────────────────────────────────────────────────────┘
          │
          │ Real-time Subscriptions
          ▼
┌─────────────────────────────────────────────────────────┐
│       React Web App (Existing)                           │
│    Real-time updates via Supabase subscriptions         │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Bot Service:**
- **Runtime**: Node.js 18+ with TypeScript
- **WhatsApp Integration**: whatsapp-web.js (via Puppeteer)
- **Database Client**: @supabase/supabase-js
- **Process Manager**: PM2 (for production)
- **Logging**: Winston
- **Testing**: Jest

**Alternative Considered:**
- Twilio WhatsApp API (official, more reliable, but paid)
- Decision: Start with whatsapp-web.js, migrate to Twilio if needed

---

## Task Checklist

### Phase 1: Foundation & Basic Bot Setup (Week 1-2)
- [ ] **1.1** Set up bot directory structure
  - [ ] Create `bot/` directory at project root
  - [ ] Initialize Node.js project (`npm init`)
  - [ ] Install dependencies (whatsapp-web.js, @supabase/supabase-js, typescript)
  - [ ] Configure TypeScript (`tsconfig.json`)
- [ ] **1.2** Configure secondary WhatsApp number
  - [ ] Obtain secondary phone number (Google Voice/Twilio)
  - [ ] Set up WhatsApp account on secondary number
  - [ ] Test WhatsApp account activation
- [ ] **1.3** Implement WhatsApp client connection
  - [ ] Create `src/whatsapp-client.ts`
  - [ ] Implement QR code authentication
  - [ ] Test persistent session storage
  - [ ] Implement reconnection logic
- [ ] **1.4** Set up Supabase integration
  - [ ] Create `src/supabase-client.ts`
  - [ ] Configure service role authentication
  - [ ] Test database queries
  - [ ] Implement error handling
- [x] **1.5** Add WhatsApp number linking ✅ COMPLETE
  - [x] Database columns exist: `whatsapp_mobile_number` and `whatsapp_group_member`
  - [x] 25 of 67 players have phone numbers (E.164 format)
  - [ ] Create player matching logic (`src/utils/player-matcher.ts`)
  - [x] Phone linking UI exists in web app (data present in production)
- [ ] **1.6** Create bot message tracking
  - [ ] Create `bot_messages` table (migration)
  - [ ] Implement message ID storage
  - [ ] Link messages to games

### Phase 2: Core Functionality (Week 3-4)
- [ ] **2.1** Implement reaction-based registration
  - [ ] Create `src/handlers/reaction-handler.ts`
  - [ ] Detect 👍 reactions on game announcements
  - [ ] Identify player from WhatsApp number
  - [ ] Call registration RPC function
  - [ ] Send confirmation message
  - [ ] Handle registration window validation
  - [ ] Handle errors (not registered, window closed, etc.)
- [ ] **2.2** Implement basic commands
  - [ ] Create `src/handlers/command-handler.ts`
  - [ ] Implement `/xp` command
  - [ ] Implement `/stats` command
  - [ ] Implement `/tokens` command
  - [ ] Implement `/shields` command
  - [ ] Implement `/nextgame` command
  - [ ] Implement `/winrate` command
  - [ ] Add command help (`/help`)
- [ ] **2.3** Create stats service
  - [ ] Create `src/services/stats.service.ts`
  - [ ] Fetch player XP from database
  - [ ] Fetch game statistics
  - [ ] Fetch token status
  - [ ] Fetch shield token status
  - [ ] Format stats for WhatsApp display
- [ ] **2.4** Implement priority token usage
  - [ ] Detect 👍🪙 reaction combination
  - [ ] Validate token availability
  - [ ] Call `use_player_token` RPC
  - [ ] Register with token flag
  - [ ] Send confirmation message
- [ ] **2.5** Implement shield token usage
  - [ ] Detect 🛡️ emoji message
  - [ ] Validate shield availability
  - [ ] Call `use_shield_token` RPC
  - [ ] Send confirmation with frozen streak details
  - [ ] Handle shield cancellation

### Phase 3: Automated Announcements (Week 5)
- [ ] **3.1** Create announcement service
  - [ ] Create `src/services/announcement.service.ts`
  - [ ] Reuse message formatting from `src/components/admin/team-balancing/WhatsAppExport.tsx`
  - [ ] Implement game announcement templates
  - [ ] Implement player selection templates
  - [ ] Implement team announcement templates
- [ ] **3.2** Create Supabase Edge Function for webhook
  - [ ] Create `supabase/functions/send-whatsapp-announcement/index.ts`
  - [ ] Implement bot webhook endpoint
  - [ ] Add authentication for webhook calls
  - [ ] Handle different announcement types
- [ ] **3.3** Integrate with registration close
  - [ ] Update `src/hooks/useRegistrationClose.ts`
  - [ ] Call edge function after player selection
  - [ ] Pass game ID and announcement type
  - [ ] Handle webhook failures gracefully
- [ ] **3.4** Create bot HTTP server
  - [ ] Set up Express server in bot
  - [ ] Create `/send` endpoint
  - [ ] Validate request authentication
  - [ ] Queue messages for sending
  - [ ] Return success/failure status
- [ ] **3.5** Implement scheduled announcements
  - [ ] Registration opening announcement
  - [ ] Registration closing reminder (1 hour before)
  - [ ] Payment reminders
  - [ ] Game day reminders

### Phase 4: Advanced Features (Week 6-8)
- [ ] **4.1** Natural language processing
  - [ ] Implement simple NLP for common questions
  - [ ] Handle variations of XP queries
  - [ ] Handle registration status queries
  - [ ] Handle token/shield availability queries
- [ ] **4.2** Admin commands
  - [ ] Implement `/admin` command prefix
  - [ ] Add admin authorization check
  - [ ] Implement `/admin register @player`
  - [ ] Implement `/admin unregister @player`
  - [ ] Implement `/admin token @player`
  - [ ] Implement `/admin shield @player`
  - [ ] Implement `/admin announce <game-id>`
- [ ] **4.3** Payment tracking integration
  - [ ] Handle "I've paid" messages
  - [ ] Create pending payment record
  - [ ] Notify admin for verification
  - [ ] Send confirmation when verified
- [ ] **4.4** Create bot interaction audit
  - [ ] Create `bot_interactions` table (migration)
  - [ ] Log all commands
  - [ ] Log all reactions
  - [ ] Log success/failure
  - [ ] Create admin analytics page

### Phase 5: Reliability & Monitoring (Week 9-10)
- [ ] **5.1** Implement error handling
  - [ ] Add retry logic for failed messages
  - [ ] Implement exponential backoff
  - [ ] Add rate limiting
  - [ ] Implement graceful degradation
  - [ ] Create message queue for downtime
- [ ] **5.2** Add logging and monitoring
  - [ ] Set up Winston logger
  - [ ] Configure log rotation
  - [ ] Add structured logging
  - [ ] Set up Sentry for error tracking
  - [ ] Create health check endpoint
- [ ] **5.3** Create admin monitoring dashboard
  - [ ] Create `src/pages/admin/BotStatus.tsx`
  - [ ] Show bot online/offline status
  - [ ] Display message stats
  - [ ] Show error logs
  - [ ] Display command usage analytics
  - [ ] Add manual message resend
- [ ] **5.4** Production deployment
  - [ ] Set up VPS/hosting (Railway/Render/Digital Ocean)
  - [ ] Configure PM2 process manager
  - [ ] Set up auto-restart on failure
  - [ ] Configure environment variables
  - [ ] Set up SSL/TLS for webhooks
  - [ ] Test production deployment
- [ ] **5.5** Documentation and handoff
  - [ ] Document bot setup process
  - [ ] Document deployment process
  - [ ] Create troubleshooting guide
  - [ ] Document admin commands
  - [ ] Create player user guide

---

## Phase 1: Foundation & Basic Bot Setup

**Timeline**: Week 1-2
**Goal**: Create working bot that can connect to WhatsApp and Supabase

### Directory Structure

```
wnf/
├── bot/                           # NEW - Bot service
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── whatsapp-client.ts    # WhatsApp connection manager
│   │   ├── supabase-client.ts    # Supabase integration
│   │   ├── config.ts             # Environment & configuration
│   │   ├── handlers/
│   │   │   ├── reaction-handler.ts
│   │   │   ├── command-handler.ts
│   │   │   └── message-handler.ts
│   │   ├── services/
│   │   │   ├── registration.service.ts
│   │   │   ├── stats.service.ts
│   │   │   └── announcement.service.ts
│   │   └── utils/
│   │       ├── message-formatter.ts
│   │       ├── player-matcher.ts
│   │       └── logger.ts
│   ├── sessions/                 # WhatsApp session storage
│   ├── logs/                     # Log files
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                      # Environment variables
│   └── .gitignore
├── supabase/
│   ├── functions/
│   │   └── send-whatsapp-announcement/  # NEW - Webhook endpoint
│   │       └── index.ts
│   └── migrations/
│       ├── YYYYMMDD_add_whatsapp_phone_to_players.sql     # NEW
│       ├── YYYYMMDD_create_bot_messages_table.sql         # NEW
│       └── YYYYMMDD_create_bot_interactions_table.sql     # NEW
└── src/                          # Existing web app
    └── pages/
        └── admin/
            └── BotStatus.tsx     # NEW - Bot monitoring page
```

### 1.1 Bot Project Setup

**package.json:**
```json
{
  "name": "wnf-whatsapp-bot",
  "version": "1.0.0",
  "description": "WhatsApp bot for WNF game management",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "whatsapp-web.js": "^1.23.0",
    "qrcode-terminal": "^0.12.0",
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.1",
    "jest": "^29.7.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**.env.example:**
```env
# WhatsApp Configuration
WA_SESSION_PATH=./sessions
WA_GROUP_ID=

# Supabase Configuration
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Bot Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Webhook Authentication
WEBHOOK_SECRET=

# Admin WhatsApp Numbers (comma-separated)
ADMIN_PHONE_NUMBERS=
```

### 1.2 WhatsApp Client Implementation

**src/whatsapp-client.ts:**
```typescript
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from './utils/logger';
import config from './config';

export class WhatsAppClient {
  private client: Client;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.sessionPath
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // QR Code for authentication
    this.client.on('qr', (qr) => {
      logger.info('QR Code received, scan to authenticate:');
      qrcode.generate(qr, { small: true });
    });

    // Ready event
    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
      this.isReady = true;
    });

    // Authentication success
    this.client.on('authenticated', () => {
      logger.info('WhatsApp client authenticated successfully');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      logger.error('Authentication failure:', msg);
      this.isReady = false;
    });

    // Disconnection
    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    // Message received
    this.client.on('message', async (msg: Message) => {
      await this.handleMessage(msg);
    });

    // Message reaction
    this.client.on('message_reaction', async (reaction) => {
      await this.handleReaction(reaction);
    });
  }

  private async handleMessage(msg: Message): Promise<void> {
    // Will be implemented in Phase 2
    logger.debug('Message received:', msg.body);
  }

  private async handleReaction(reaction: any): Promise<void> {
    // Will be implemented in Phase 2
    logger.debug('Reaction received:', reaction);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing WhatsApp client...');
    await this.client.initialize();
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }
    await this.client.sendMessage(chatId, message);
    logger.info(`Message sent to ${chatId}`);
  }

  getClient(): Client {
    return this.client;
  }

  isClientReady(): boolean {
    return this.isReady;
  }
}
```

### 1.3 Supabase Client Setup

**src/supabase-client.ts:**
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from './config';
import { logger } from './utils/logger';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    logger.info('Supabase client initialized');
  }

  /**
   * Find player by WhatsApp phone number
   */
  async findPlayerByPhone(phone: string) {
    const { data, error } = await this.client
      .from('players')
      .select('id, friendly_name, whatsapp_mobile_number, user_id')
      .eq('whatsapp_mobile_number', phone)
      .maybeSingle();

    if (error) {
      logger.error('Error finding player by phone:', error);
      throw error;
    }

    return data;
  }

  /**
   * Register player for game
   */
  async registerPlayer(playerId: string, gameId: string, usingToken: boolean = false) {
    // Check if already registered
    const { data: existing } = await this.client
      .from('game_registrations')
      .select('id')
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Already registered' };
    }

    // If using token, call RPC to use token first
    if (usingToken) {
      const { data: tokenResult, error: tokenError } = await this.client
        .rpc('use_player_token', {
          p_player_id: playerId,
          p_game_id: gameId
        });

      if (tokenError || !tokenResult) {
        return { success: false, error: 'Failed to use token' };
      }
    }

    // Create registration
    const { error } = await this.client
      .from('game_registrations')
      .insert({
        game_id: gameId,
        player_id: playerId,
        status: 'registered',
        using_token: usingToken
      });

    if (error) {
      logger.error('Error registering player:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get player stats
   */
  async getPlayerStats(playerId: string) {
    const { data, error } = await this.client
      .from('player_xp')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error) {
      logger.error('Error fetching player stats:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get token status
   */
  async getTokenStatus(playerId: string) {
    const { data, error } = await this.client
      .from('public_player_token_status')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching token status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get shield token status
   */
  async getShieldStatus(playerId: string) {
    const { data, error } = await this.client
      .from('player_shield_status')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching shield status:', error);
      throw error;
    }

    return data;
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}

export const supabaseService = new SupabaseService();
```

### 1.4 Main Entry Point

**src/index.ts:**
```typescript
import { WhatsAppClient } from './whatsapp-client';
import { logger } from './utils/logger';
import config from './config';

async function main() {
  logger.info('Starting WNF WhatsApp Bot...');
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Log Level: ${config.logLevel}`);

  try {
    const whatsappClient = new WhatsAppClient();
    await whatsappClient.initialize();

    logger.info('Bot is running...');
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

main();
```

### 1.5 Database Migrations

**✅ MIGRATION NOT NEEDED - Columns already exist!**

The `players` table already has the required columns:
- `whatsapp_mobile_number` (TEXT) - Phone number in E.164 format
- `whatsapp_group_member` (TEXT) - "Yes"/"No" flag for group membership

Current data: 25 of 67 players have phone numbers stored.

**supabase/migrations/20251010_create_bot_messages_table.sql:**
```sql
-- Track bot-sent messages for future reference
CREATE TABLE IF NOT EXISTS bot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id VARCHAR(255) NOT NULL UNIQUE,  -- WhatsApp message ID
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  message_type VARCHAR(50) NOT NULL,  -- 'announcement', 'player_selection', 'team_announcement', 'reminder'
  message_content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to VARCHAR(50),  -- Group ID or phone number
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_bot_messages_game_id ON bot_messages(game_id);
CREATE INDEX idx_bot_messages_type ON bot_messages(message_type);
CREATE INDEX idx_bot_messages_sent_at ON bot_messages(sent_at DESC);

-- Add RLS policies
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all messages
CREATE POLICY "Admins can view all bot messages"
  ON bot_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN admin_roles ar ON p.id = ar.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- System can insert messages (via service role)
CREATE POLICY "Service role can insert bot messages"
  ON bot_messages
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

**supabase/migrations/20251010_create_bot_interactions_table.sql:**
```sql
-- Track all bot interactions for analytics
CREATE TABLE IF NOT EXISTS bot_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  phone_number VARCHAR(20),  -- Store even if player not found
  interaction_type VARCHAR(50) NOT NULL,  -- 'command', 'reaction', 'message'
  command VARCHAR(100),
  message_content TEXT,
  response TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_bot_interactions_player_id ON bot_interactions(player_id);
CREATE INDEX idx_bot_interactions_type ON bot_interactions(interaction_type);
CREATE INDEX idx_bot_interactions_created_at ON bot_interactions(created_at DESC);

-- Add RLS policies
ALTER TABLE bot_interactions ENABLE ROW LEVEL SECURITY;

-- Admins can view all interactions
CREATE POLICY "Admins can view all bot interactions"
  ON bot_interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN admin_roles ar ON p.id = ar.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Service role can insert interactions
CREATE POLICY "Service role can insert bot interactions"
  ON bot_interactions
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### 1.6 Configuration Management

**src/config.ts:**
```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
  nodeEnv: string;
  logLevel: string;
  port: number;
  sessionPath: string;
  groupId: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  webhook: {
    secret: string;
  };
  admin: {
    phoneNumbers: string[];
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',
  port: parseInt(process.env.PORT || '3001', 10),
  sessionPath: process.env.WA_SESSION_PATH || path.join(__dirname, '../sessions'),
  groupId: process.env.WA_GROUP_ID || '',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'changeme'
  },
  admin: {
    phoneNumbers: (process.env.ADMIN_PHONE_NUMBERS || '').split(',').filter(Boolean)
  }
};

// Validate required config
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WA_GROUP_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}

export default config;
```

### 1.7 Logging Setup

**src/utils/logger.ts:**
```typescript
import winston from 'winston';
import config from '../config';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log')
    })
  ]
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
```

---

## Phase 2: Core Functionality

**Timeline**: Week 3-4
**Goal**: Implement reaction-based registration and interactive commands

### 2.1 Reaction Handler Implementation

**References:**
- Existing registration logic: `src/hooks/useGameRegistration.ts`
- Token system: `docs/TokenSystem.md`

**src/handlers/reaction-handler.ts:**
```typescript
import { Message } from 'whatsapp-web.js';
import { supabaseService } from '../supabase-client';
import { logger } from '../utils/logger';
import { formatPhoneNumber } from '../utils/phone-formatter';

export class ReactionHandler {
  /**
   * Handle reaction events
   */
  async handleReaction(reaction: any): Promise<void> {
    try {
      const { emoji, messageId, senderId } = reaction;

      logger.debug('Processing reaction:', { emoji, messageId, senderId });

      // Only process thumbs up reactions
      if (emoji !== '👍') {
        return;
      }

      // Check if this is a game announcement message
      const gameId = await this.identifyGameMessage(messageId);
      if (!gameId) {
        logger.debug('Reaction not on a game announcement');
        return;
      }

      // Match player from WhatsApp number
      const phone = formatPhoneNumber(senderId);
      const player = await supabaseService.findPlayerByPhone(phone);

      if (!player) {
        logger.warn('Player not found for phone:', phone);
        // Could send a message to register on website
        return;
      }

      // Check if registration window is open
      const game = await this.getGame(gameId);
      if (!this.isRegistrationOpen(game)) {
        logger.info('Registration window closed for game:', gameId);
        return;
      }

      // Check for priority token usage (if they also reacted with 🪙)
      const usingToken = await this.checkTokenReaction(messageId, senderId);

      // Register the player
      const result = await supabaseService.registerPlayer(
        player.id,
        gameId,
        usingToken
      );

      if (result.success) {
        logger.info(`Player ${player.friendly_name} registered for game ${gameId}`);

        // Log interaction
        await this.logInteraction(player.id, phone, 'reaction', result);
      } else {
        logger.warn(`Registration failed for ${player.friendly_name}:`, result.error);
      }
    } catch (error) {
      logger.error('Error handling reaction:', error);
    }
  }

  private async identifyGameMessage(messageId: string): Promise<string | null> {
    const { data } = await supabaseService.getClient()
      .from('bot_messages')
      .select('game_id')
      .eq('message_id', messageId)
      .eq('message_type', 'announcement')
      .maybeSingle();

    return data?.game_id || null;
  }

  private async getGame(gameId: string) {
    const { data } = await supabaseService.getClient()
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    return data;
  }

  private isRegistrationOpen(game: any): boolean {
    const now = new Date();
    const windowStart = new Date(game.registration_window_start);
    const windowEnd = new Date(game.registration_window_end);

    return now >= windowStart && now <= windowEnd && game.status === 'open';
  }

  private async checkTokenReaction(messageId: string, senderId: string): Promise<boolean> {
    // Implementation to check if user also reacted with 🪙
    // This would require checking all reactions on the message
    return false; // TODO: Implement
  }

  private async logInteraction(
    playerId: string,
    phone: string,
    type: string,
    result: any
  ): Promise<void> {
    await supabaseService.getClient()
      .from('bot_interactions')
      .insert({
        player_id: playerId,
        phone_number: phone,
        interaction_type: type,
        response: JSON.stringify(result),
        success: result.success,
        error_message: result.error || null
      });
  }
}
```

### 2.2 Command Handler Implementation

**References:**
- Stats display: `src/pages/Profile.tsx`
- Token status: `src/components/profile/TokenStatus.tsx`
- Shield status: `src/components/profile/ShieldTokenStatus.tsx`

**src/handlers/command-handler.ts:**
```typescript
import { Message } from 'whatsapp-web.js';
import { supabaseService } from '../supabase-client';
import { StatsService } from '../services/stats.service';
import { logger } from '../utils/logger';
import { formatPhoneNumber } from '../utils/phone-formatter';

export class CommandHandler {
  private statsService: StatsService;

  constructor() {
    this.statsService = new StatsService();
  }

  async handleMessage(msg: Message): Promise<void> {
    const command = msg.body.trim().toLowerCase();

    // Only process commands that start with /
    if (!command.startsWith('/')) {
      return;
    }

    try {
      // Match player
      const phone = formatPhoneNumber(msg.from);
      const player = await supabaseService.findPlayerByPhone(phone);

      if (!player) {
        await msg.reply("❌ Your phone number isn't linked to a player account.\nPlease register at https://wnf.app");
        return;
      }

      // Route to appropriate command handler
      if (command === '/xp') {
        await this.handleXP(msg, player);
      } else if (command === '/stats') {
        await this.handleStats(msg, player);
      } else if (command === '/tokens') {
        await this.handleTokens(msg, player);
      } else if (command === '/shields') {
        await this.handleShields(msg, player);
      } else if (command === '/nextgame') {
        await this.handleNextGame(msg, player);
      } else if (command === '/winrate') {
        await this.handleWinRate(msg, player);
      } else if (command === '/help') {
        await this.handleHelp(msg);
      } else {
        await msg.reply("❓ Unknown command. Type /help for available commands.");
      }

      // Log interaction
      await this.logInteraction(player.id, phone, 'command', command);
    } catch (error) {
      logger.error('Error handling command:', error);
      await msg.reply("❌ An error occurred processing your command. Please try again later.");
    }
  }

  private async handleXP(msg: Message, player: any): Promise<void> {
    const xp = await this.statsService.getPlayerXP(player.id);
    const rarity = this.statsService.getRarityTier(xp);

    await msg.reply(`🎮 *Your XP*\n\nXP: ${xp.toLocaleString()}\nRank: ${rarity}`);
  }

  private async handleStats(msg: Message, player: any): Promise<void> {
    const stats = await this.statsService.getPlayerStats(player.id);

    const message = `📊 *Stats for ${player.friendly_name}*\n\n` +
      `🎮 XP: ${stats.xp.toLocaleString()}\n` +
      `🔥 Streak: ${stats.current_streak} games\n` +
      `🏆 Win Rate: ${stats.win_rate}%\n` +
      `⚽ Goal Diff: ${stats.goal_differential > 0 ? '+' : ''}${stats.goal_differential}\n` +
      `🎯 Caps: ${stats.caps}\n` +
      `⭐ Max Streak: ${stats.max_streak}`;

    await msg.reply(message);
  }

  private async handleTokens(msg: Message, player: any): Promise<void> {
    const tokenStatus = await this.statsService.getTokenStatus(player.id);

    const hasToken = tokenStatus?.status === 'AVAILABLE';
    const message = `🪙 *Priority Token Status*\n\n` +
      `Status: ${hasToken ? '✅ Available' : '❌ Not Available'}\n` +
      (tokenStatus?.last_used_at ? `Last Used: ${new Date(tokenStatus.last_used_at).toLocaleDateString()}\n` : '') +
      `\nTo use your token, react to a game announcement with 👍 and 🪙`;

    await msg.reply(message);
  }

  private async handleShields(msg: Message, player: any): Promise<void> {
    const shieldStatus = await this.statsService.getShieldStatus(player.id);

    const message = `🛡️ *Shield Token Status*\n\n` +
      `Shields: ${shieldStatus?.shield_tokens_available || 0}/4\n` +
      `Progress: ${shieldStatus?.games_toward_next_token || 0}/10 games\n` +
      `Active: ${shieldStatus?.shield_active ? '✅ Yes' : '❌ No'}\n` +
      (shieldStatus?.frozen_streak_value ? `Frozen Streak: ${shieldStatus.frozen_streak_value} games\n` : '') +
      `\nTo use a shield, send the 🛡️ emoji when a game is announced.`;

    await msg.reply(message);
  }

  private async handleNextGame(msg: Message, player: any): Promise<void> {
    const nextGame = await this.statsService.getNextGame();

    if (!nextGame) {
      await msg.reply("📅 No upcoming games scheduled yet.");
      return;
    }

    const gameDate = new Date(nextGame.date);
    const message = `📅 *Next Game*\n\n` +
      `Date: ${gameDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
      `Time: ${gameDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}\n` +
      `📍 ${nextGame.venue.name}\n` +
      `⚽ ${nextGame.max_players} players\n` +
      `\nView details: https://wnf.app/games`;

    await msg.reply(message);
  }

  private async handleWinRate(msg: Message, player: any): Promise<void> {
    const stats = await this.statsService.getPlayerStats(player.id);

    const totalGames = (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0);
    const message = `🏆 *Win/Loss Record*\n\n` +
      `Win Rate: ${stats.win_rate}%\n` +
      `✅ Wins: ${stats.wins || 0}\n` +
      `❌ Losses: ${stats.losses || 0}\n` +
      `🤝 Draws: ${stats.draws || 0}\n` +
      `📊 Total Games: ${totalGames}`;

    await msg.reply(message);
  }

  private async handleHelp(msg: Message): Promise<void> {
    const message = `📋 *Available Commands*\n\n` +
      `/xp - Check your XP\n` +
      `/stats - View your full stats\n` +
      `/tokens - Priority token status\n` +
      `/shields - Shield token status\n` +
      `/nextgame - Next game info\n` +
      `/winrate - Win/loss record\n` +
      `/help - Show this message\n\n` +
      `💡 *Quick Actions*\n` +
      `👍 - Register for a game\n` +
      `🪙 - Use priority token (with 👍)\n` +
      `🛡️ - Use shield token`;

    await msg.reply(message);
  }

  private async logInteraction(
    playerId: string,
    phone: string,
    type: string,
    command: string
  ): Promise<void> {
    await supabaseService.getClient()
      .from('bot_interactions')
      .insert({
        player_id: playerId,
        phone_number: phone,
        interaction_type: type,
        command: command,
        success: true
      });
  }
}
```

### 2.3 Stats Service

**src/services/stats.service.ts:**
```typescript
import { supabaseService } from '../supabase-client';

export class StatsService {
  async getPlayerXP(playerId: string): Promise<number> {
    const stats = await supabaseService.getPlayerStats(playerId);
    return stats?.xp || 0;
  }

  async getPlayerStats(playerId: string) {
    const stats = await supabaseService.getPlayerStats(playerId);

    // Fetch additional win/loss data
    const { data: gameHistory } = await supabaseService.getClient()
      .from('game_registrations')
      .select(`
        game_id,
        team,
        games (
          outcome,
          score_blue,
          score_orange
        )
      `)
      .eq('player_id', playerId)
      .eq('status', 'selected');

    let wins = 0;
    let losses = 0;
    let draws = 0;

    gameHistory?.forEach((reg: any) => {
      const outcome = reg.games?.outcome;
      const team = reg.team;

      if (outcome === 'draw') {
        draws++;
      } else if (
        (outcome === 'blue_win' && team === 'blue') ||
        (outcome === 'orange_win' && team === 'orange')
      ) {
        wins++;
      } else if (outcome) {
        losses++;
      }
    });

    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    return {
      ...stats,
      wins,
      losses,
      draws,
      win_rate: winRate
    };
  }

  async getTokenStatus(playerId: string) {
    return await supabaseService.getTokenStatus(playerId);
  }

  async getShieldStatus(playerId: string) {
    return await supabaseService.getShieldStatus(playerId);
  }

  async getNextGame() {
    const { data } = await supabaseService.getClient()
      .from('games')
      .select(`
        *,
        venue:venues(*)
      `)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();

    return data;
  }

  getRarityTier(xp: number): string {
    if (xp >= 10000) return 'Mythical';
    if (xp >= 5000) return 'Legendary';
    if (xp >= 2500) return 'Epic';
    if (xp >= 1000) return 'Rare';
    if (xp >= 500) return 'Uncommon';
    return 'Common';
  }
}
```

---

## Phase 3: Automated Announcements

**Timeline**: Week 5
**Goal**: Automatically send WhatsApp messages for game events

### 3.1 Announcement Service

**References:**
- Message formatting: `src/components/admin/team-balancing/WhatsAppExport.tsx`
- Announcement templates: `docs/components/WhatsAppMessaging.md`

**src/services/announcement.service.ts:**
```typescript
import { supabaseService } from '../supabase-client';
import { logger } from '../utils/logger';

export class AnnouncementService {
  /**
   * Generate game announcement message
   */
  async generateGameAnnouncement(gameId: string): Promise<string> {
    const game = await this.getGameDetails(gameId);
    const tokenEligible = await this.getTokenEligiblePlayers(gameId);

    const gameDate = new Date(game.date);
    const regEnd = new Date(game.registration_window_end);

    let message = `📅 ${gameDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}\n`;
    message += `⏰ ${gameDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}\n`;
    message += `🎮 WNF #${game.sequence_number}\n`;
    message += `📍 ${game.venue.name}\n`;
    message += `📍 ${game.venue.google_maps_url}\n`;
    message += `🔗 Game Details: https://wnf.app/games\n`;
    message += `⚽ ${game.max_players} players / ${Math.floor(game.max_players / 2)}-a-side\n\n`;

    message += `*Registration closes ${regEnd.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })}*\n\n`;

    message += `React with 👍 to register!\n\n`;

    if (tokenEligible.length > 0) {
      message += `🪙 *Priority Token Available:*\n`;
      tokenEligible.forEach(player => {
        message += `• ${player.friendly_name}\n`;
      });
      message += `\nReact with 👍 and 🪙 to use your token\n\n`;
    }

    message += `Can't play? Reserves outside the group react here 👇`;

    return message;
  }

  /**
   * Generate player selection announcement
   * Reuses logic from WhatsAppExport.tsx
   */
  async generatePlayerSelectionAnnouncement(gameId: string): Promise<string> {
    const game = await this.getGameDetails(gameId);
    const registrations = await this.getGameRegistrations(gameId);
    const shieldPlayers = await this.getShieldPlayers(gameId);

    // Sort registrations
    const selected = registrations.filter(r => r.status === 'selected');
    const reserves = registrations.filter(r => r.status === 'reserve');
    const droppedOut = registrations.filter(r => r.status === 'dropped_out');

    // Count selection methods
    const tokenUsers = selected.filter(r => r.using_token).length;
    const randomPicks = selected.filter(r => r.selection_method === 'random').length;
    const meritPicks = selected.filter(r => r.selection_method === 'merit').length;

    // Check for unpaid games
    const hasUnpaidPlayers = selected.some(r => r.player.unpaid_games > 0) ||
                            reserves.some(r => r.player.unpaid_games > 0);

    let message = `✅ *SELECTED PLAYERS FOR NEXT GAME*\n\n`;

    // Selection summary
    if (tokenUsers > 0) {
      message += `🪙 ${tokenUsers} Guaranteed token${tokenUsers > 1 ? 's' : ''} used this week\n`;
    }
    if (meritPicks > 0) {
      message += `✅ First ${meritPicks} player${meritPicks > 1 ? 's' : ''} chosen by XP\n`;
    }
    if (randomPicks > 0) {
      message += `🎲 Remaining ${randomPicks} player${randomPicks > 1 ? 's' : ''} chosen at random\n`;
    }
    if (hasUnpaidPlayers) {
      message += `💰 XP penalty due to missing payments\n`;
    }
    message += `\n`;

    // Selected players
    message += `✅ *Selected Players (${selected.length}):*\n`;
    const sortedSelected = this.sortPlayersForDisplay(selected);
    sortedSelected.forEach(reg => {
      let prefix = '';
      if (reg.using_token) prefix += '🪙';
      if (reg.selection_method === 'random') prefix += '🎲';
      if (reg.player.unpaid_games > 0) prefix += '💰';
      message += `${prefix} ${reg.player.friendly_name}\n`;
    });
    message += `\n`;

    // Reserves
    if (reserves.length > 0) {
      message += `🔄 *Reserves in XP order (${reserves.length}):*\n`;
      const sortedReserves = reserves.sort((a, b) => b.player.xp - a.player.xp);
      sortedReserves.forEach(reg => {
        let prefix = '';
        if (reg.player.unpaid_games > 0) prefix = '💰 ';
        message += `${prefix}${reg.player.friendly_name}\n`;
      });
      message += `\n`;
      message += `📈 Players not selected this week get boosted chances for random selection next week\n\n`;
    }

    // Dropped out
    if (droppedOut.length > 0) {
      message += `❌ *Dropped Out:*\n`;
      droppedOut.forEach(reg => {
        message += `${reg.player.friendly_name}\n`;
      });
      message += `\n`;
    }

    // Shield players
    if (shieldPlayers.length > 0) {
      message += `🛡️ *Protected Players (using streak shields):*\n`;
      shieldPlayers.forEach(player => {
        message += `🛡️ ${player.friendly_name} (${player.frozen_streak_value} game streak frozen at +${player.frozen_streak_value * 10}% XP)\n`;
      });
      message += `\n`;
    }

    message += `Anyone needs to drop out (inc reserves) please let me know 👍`;

    return message;
  }

  /**
   * Generate team announcement
   */
  async generateTeamAnnouncement(gameId: string): Promise<string> {
    const game = await this.getGameDetails(gameId);
    const teams = await this.getTeams(gameId);

    const orangeTeam = teams.filter(r => r.team === 'orange')
      .map(r => r.player.friendly_name)
      .sort();
    const blueTeam = teams.filter(r => r.team === 'blue')
      .map(r => r.player.friendly_name)
      .sort();

    let message = `🏆 *TEAM ANNOUNCEMENT*\n\n`;

    message += `🟠 *Orange Team (${orangeTeam.length}):*\n`;
    orangeTeam.forEach(name => {
      message += `👤 ${name}\n`;
    });
    message += `\n`;

    message += `🔵 *Blue Team (${blueTeam.length}):*\n`;
    blueTeam.forEach(name => {
      message += `👤 ${name}\n`;
    });
    message += `\n`;

    message += `See you on the pitch! ⚽`;

    return message;
  }

  // Helper methods
  private async getGameDetails(gameId: string) {
    const { data } = await supabaseService.getClient()
      .from('games')
      .select('*, venue:venues(*)')
      .eq('id', gameId)
      .single();
    return data;
  }

  private async getTokenEligiblePlayers(gameId: string) {
    const { data } = await supabaseService.getClient()
      .from('public_player_token_status')
      .select('player_id, friendly_name')
      .eq('status', 'AVAILABLE');
    return data || [];
  }

  private async getGameRegistrations(gameId: string) {
    const { data } = await supabaseService.getClient()
      .from('game_registrations')
      .select(`
        *,
        player:players(
          friendly_name,
          xp,
          unpaid_games
        )
      `)
      .eq('game_id', gameId);
    return data || [];
  }

  private async getShieldPlayers(gameId: string) {
    const { data } = await supabaseService.getClient()
      .from('shield_token_usage')
      .select(`
        players!shield_token_usage_player_id_fkey(
          friendly_name,
          frozen_streak_value
        )
      `)
      .eq('game_id', gameId);

    return (data || [])
      .map((item: any) => item.players)
      .filter(Boolean);
  }

  private async getTeams(gameId: string) {
    const { data } = await supabaseService.getClient()
      .from('game_registrations')
      .select(`
        team,
        player:players(friendly_name)
      `)
      .eq('game_id', gameId)
      .eq('status', 'selected')
      .in('team', ['blue', 'orange']);
    return data || [];
  }

  private sortPlayersForDisplay(registrations: any[]) {
    // Token users first, then by XP
    return registrations.sort((a, b) => {
      if (a.using_token && !b.using_token) return -1;
      if (!a.using_token && b.using_token) return 1;
      return b.player.xp - a.player.xp;
    });
  }
}
```

### 3.2 Webhook Integration

**supabase/functions/send-whatsapp-announcement/index.ts:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const BOT_WEBHOOK_URL = Deno.env.get('BOT_WEBHOOK_URL');
const BOT_WEBHOOK_SECRET = Deno.env.get('BOT_WEBHOOK_SECRET');

serve(async (req) => {
  try {
    const { gameId, announcementType } = await req.json();

    if (!gameId || !announcementType) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Send to bot service
    const response = await fetch(`${BOT_WEBHOOK_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOT_WEBHOOK_SECRET}`
      },
      body: JSON.stringify({
        gameId,
        announcementType,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Bot webhook failed: ${response.statusText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending announcement:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.3 Bot HTTP Server

**src/server.ts:**
```typescript
import express, { Request, Response } from 'express';
import { WhatsAppClient } from './whatsapp-client';
import { AnnouncementService } from './services/announcement.service';
import { supabaseService } from './supabase-client';
import { logger } from './utils/logger';
import config from './config';

export class BotServer {
  private app: express.Application;
  private whatsappClient: WhatsAppClient;
  private announcementService: AnnouncementService;

  constructor(whatsappClient: WhatsAppClient) {
    this.app = express();
    this.whatsappClient = whatsappClient;
    this.announcementService = new AnnouncementService();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());

    // Authentication middleware
    this.app.use((req, res, next) => {
      const authHeader = req.headers.authorization;

      if (req.path === '/health') {
        return next();
      }

      if (!authHeader || authHeader !== `Bearer ${config.webhook.secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        whatsappReady: this.whatsappClient.isClientReady(),
        timestamp: new Date().toISOString()
      });
    });

    // Send announcement
    this.app.post('/send', async (req: Request, res: Response) => {
      try {
        const { gameId, announcementType } = req.body;

        logger.info('Received announcement request:', { gameId, announcementType });

        // Generate message based on type
        let message: string;
        if (announcementType === 'announcement') {
          message = await this.announcementService.generateGameAnnouncement(gameId);
        } else if (announcementType === 'player_selection') {
          message = await this.announcementService.generatePlayerSelectionAnnouncement(gameId);
        } else if (announcementType === 'team_announcement') {
          message = await this.announcementService.generateTeamAnnouncement(gameId);
        } else {
          return res.status(400).json({ error: 'Invalid announcement type' });
        }

        // Send to WhatsApp group
        const messageId = await this.whatsappClient.sendMessage(config.groupId, message);

        // Store message record
        await supabaseService.getClient()
          .from('bot_messages')
          .insert({
            message_id: messageId,
            game_id: gameId,
            message_type: announcementType,
            message_content: message,
            sent_to: config.groupId,
            success: true
          });

        logger.info('Announcement sent successfully');
        res.json({ success: true, messageId });
      } catch (error) {
        logger.error('Error sending announcement:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  start(): void {
    this.app.listen(config.port, () => {
      logger.info(`Bot HTTP server listening on port ${config.port}`);
    });
  }
}
```

---

## Phase 4: Advanced Features

**Timeline**: Week 6-8
**Goal**: Add NLP, admin commands, and payment tracking

*(Detailed implementation will be added when Phase 3 is complete)*

### Key Features
- Natural language understanding for common queries
- Admin-only commands for player management
- Payment notification and verification workflow
- Enhanced error handling and user feedback

---

## Phase 5: Reliability & Monitoring

**Timeline**: Week 9-10
**Goal**: Production-ready deployment with monitoring

*(Detailed implementation will be added when Phase 4 is complete)*

### Key Features
- Comprehensive error handling and retry logic
- Admin dashboard for bot monitoring
- Production deployment setup
- Documentation and handoff materials

---

## Security Considerations

### Phone Number Verification
- **Requirement**: Players must link their WhatsApp number via web app
- **Implementation**: Add phone linking UI to `src/pages/Profile.tsx`
- **Storage**: Phone numbers in E.164 format (+447123456789)
- **Uniqueness**: One phone number per player account

### Authentication
- **Service Role Key**: Stored securely in environment variables, never committed
- **Webhook Secret**: Random generated token for authenticating edge function calls
- **Admin Commands**: Check against `config.admin.phoneNumbers` list

### Rate Limiting
- **Per User**: Max 10 commands per minute
- **Global**: Max 100 messages per minute
- **Implementation**: Use in-memory cache with TTL

### Data Privacy
- **Message Content**: Not stored (only metadata)
- **Audit Trail**: Log interactions without storing full message text
- **GDPR Compliance**: Allow users to request data deletion

### WhatsApp Account Security
- **Session Protection**: Encrypt session files at rest
- **2FA**: Enable two-factor authentication on WhatsApp account
- **Backup**: Regular backups of session data

---

## Deployment Strategy

### Development Setup
1. **Local Development**: Run bot on development machine
2. **Tunneling**: Use `ngrok` for webhook testing
3. **Test Group**: Create separate WhatsApp group for testing

### Production Options

#### Option 1: Railway.app (Recommended)
- ✅ Easy deployment from GitHub
- ✅ Persistent storage for sessions
- ✅ Automatic SSL/TLS
- ✅ Environment variable management
- ✅ Logs and monitoring built-in
- 💰 ~$5-10/month

**Setup:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy
railway up
```

#### Option 2: Digital Ocean Droplet
- ✅ Full control over environment
- ✅ Can run multiple services
- ⚠️ Requires manual setup
- 💰 $5-10/month

**Setup:**
```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone repo
git clone your-repo-url
cd bot

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start dist/index.js --name wnf-bot
pm2 save
pm2 startup
```

#### Option 3: Render.com
- ✅ Free tier available
- ✅ Auto-deploy from GitHub
- ⚠️ Free tier has limitations (restarts after inactivity)
- 💰 Free or $7/month for always-on

### Process Management (Production)

**PM2 Configuration (ecosystem.config.js):**
```javascript
module.exports = {
  apps: [{
    name: 'wnf-whatsapp-bot',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### Monitoring
- **Health Checks**: `/health` endpoint every 5 minutes
- **Uptime Monitoring**: UptimeRobot (free tier)
- **Error Tracking**: Sentry (free tier for <5000 events/month)
- **Logs**: Winston with log rotation

---

## Costs & Resources

### Infrastructure Costs

| Item | Provider | Cost |
|------|----------|------|
| VPS Hosting | Railway/Render/DO | $5-10/month |
| Secondary Phone | Google Voice | Free |
| Secondary Phone | Twilio (alternative) | $1/month |
| Uptime Monitoring | UptimeRobot | Free |
| Error Tracking | Sentry | Free (5k events) |
| **Total** | | **$5-11/month** |

### Development Time

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1 | Foundation & Setup | 8-10 hours |
| Phase 2 | Core Functionality | 12-16 hours |
| Phase 3 | Announcements | 6-8 hours |
| Phase 4 | Advanced Features | 10-14 hours |
| Phase 5 | Deployment & Monitoring | 4-6 hours |
| **Total** | | **40-54 hours** |

### Resource Requirements
- **Developer Time**: 1 developer, part-time over 8-10 weeks
- **Testing**: 5-10 beta testers for 1-2 weeks
- **Admin Time**: 2-3 hours for initial setup and configuration

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WhatsApp blocks bot account | High | Medium | Use official Business API long-term, have backup manual process |
| Bot goes offline unexpectedly | Medium | Low | PM2 auto-restart, health check monitoring, alert notifications |
| Player phone number changes | Low | Medium | Easy re-linking via web app, clear instructions |
| Message delivery failures | Medium | Low | Retry logic with exponential backoff, message queue |
| Rate limiting by WhatsApp | Medium | Low | Implement conservative rate limits, monitor usage |
| Database connection issues | Medium | Low | Connection pooling, retry logic, circuit breaker |
| Spam/abuse of commands | Low | Medium | Rate limiting per user, admin controls |
| GDPR compliance issues | Medium | Low | Minimal data collection, data deletion capability |

### Contingency Plans
1. **Bot Failure**: Revert to manual announcement process
2. **WhatsApp Ban**: Migrate to official Business API
3. **Hosting Issues**: Quick migration to alternative provider (all containerized)
4. **High Load**: Horizontal scaling with load balancer

---

## Decision Log

### 2025-10-10: Technology Selection
- **Decision**: Use whatsapp-web.js instead of official API
- **Reasoning**: Lower cost, faster setup, sufficient for initial rollout
- **Alternative Considered**: Twilio WhatsApp Business API
- **Future Review**: Migrate to official API if scaling or reliability issues arise

### 2025-10-10: Architecture Pattern
- **Decision**: Separate bot service instead of integrating into web app
- **Reasoning**:
  - Different runtime requirements (persistent browser session)
  - Independent deployment and scaling
  - Clearer separation of concerns
- **Alternative Considered**: Integrate into React app backend
- **Trade-offs**: More infrastructure to manage, but better maintainability

### 2025-10-10: Hosting Provider
- **Decision**: Railway.app for initial deployment
- **Reasoning**: Easy setup, persistent storage, good developer experience
- **Alternative Considered**: Digital Ocean, Render
- **Cost**: ~$5-10/month vs manual VPS management

---

## References

### Existing Codebase Files

**Registration Logic:**
- `src/components/game/GameRegistration.tsx` - Web app registration UI
- `src/hooks/useGameRegistration.ts` - Registration hook with token support
- `src/hooks/useRegistrationClose.ts` - Registration window closing logic

**Token Systems:**
- `docs/TokenSystem.md` - Priority token documentation
- `docs/ShieldTokenSystem.md` - Shield token documentation
- `src/hooks/useShieldStatus.ts` - Shield token status hook
- `src/components/game/ShieldTokenButton.tsx` - Shield usage UI

**Messaging:**
- `src/components/admin/team-balancing/WhatsAppExport.tsx` - Message formatting
- `docs/components/WhatsAppMessaging.md` - Message template documentation

**Player Data:**
- `src/types/player.ts` - Player type definitions
- `src/types/game.ts` - Game type definitions
- `src/types/tokens.ts` - Token type definitions

**Database:**
- `supabase/migrations/` - All database migrations
- `src/utils/supabase.ts` - Supabase client configuration

### External Documentation

**whatsapp-web.js:**
- Official Guide: https://wwebjs.dev/guide/
- API Reference: https://docs.wwebjs.dev/
- GitHub: https://github.com/pedroslopez/whatsapp-web.js

**Supabase:**
- Client Library: https://supabase.com/docs/reference/javascript/introduction
- Edge Functions: https://supabase.com/docs/guides/functions
- RPC Functions: https://supabase.com/docs/reference/javascript/rpc

**Deployment:**
- Railway: https://docs.railway.app/
- PM2: https://pm2.keymetrics.io/docs/usage/quick-start/
- Digital Ocean: https://www.digitalocean.com/community/tutorials

---

## Progress Tracking

**Last Updated**: 2025-10-10
**Current Phase**: Phase 1 - Foundation & Setup
**Completion**: 0%

**Next Steps:**
1. ✅ Create this documentation file
2. ⏳ Set up bot directory structure
3. ⏳ Initialize Node.js project
4. ⏳ Obtain secondary phone number
5. ⏳ Implement WhatsApp client connection

---

## Notes & Observations

### Session 1 (2025-10-10)
- Created comprehensive planning document
- Researched codebase architecture and existing systems
- Identified integration points with token/shield systems
- Decided on whatsapp-web.js for initial implementation

*(Add notes here as you work through the project)*

---

**End of Document**
