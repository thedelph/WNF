# Integration Examples - WhatsApp Bot

**Date:** 2025-10-20
**Purpose:** Complete code examples for bot Phase 2 implementation
**Reference:** WEB_APP_HANDOVER.md, DATABASE_SCHEMA_REFERENCE.md

---

## 📋 Table of Contents
1. [Helper Functions](#helper-functions)
2. [Command Handlers](#command-handlers)
3. [Reaction Handlers](#reaction-handlers)
4. [Message Tracking](#message-tracking)
5. [Error Handling](#error-handling)
6. [Testing Utilities](#testing-utilities)

---

## Helper Functions

### Phone Number Formatting

```typescript
/**
 * Convert WhatsApp ID to E.164 phone number
 * @param whatsappId - WhatsApp ID (e.g., 447123456789@c.us)
 * @returns E.164 formatted phone (e.g., +447123456789)
 */
function formatPhoneNumber(whatsappId: string): string {
  // Remove domain suffix (@c.us or @g.us)
  const number = whatsappId.split('@')[0];

  // Add + prefix for E.164 format
  return `+${number}`;
}

// Examples:
formatPhoneNumber('447123456789@c.us')    // => '+447123456789'
formatPhoneNumber('12025551234@c.us')     // => '+12025551234'
```

### Player Lookup

```typescript
/**
 * Find player by WhatsApp phone number
 * @param phoneNumber - E.164 formatted phone
 * @returns Player data or null if not found
 */
async function findPlayerByPhone(phoneNumber: string) {
  const { data, error } = await supabaseService.getClient()
    .from('players')
    .select('id, friendly_name, whatsapp_mobile_number, user_id')
    .eq('whatsapp_mobile_number', phoneNumber)
    .maybeSingle();

  if (error) {
    logger.error('Error finding player by phone:', error);
    return null;
  }

  return data;
}

// Usage:
const phone = formatPhoneNumber(msg.from);
const player = await findPlayerByPhone(phone);

if (!player) {
  await msg.reply("❌ Your phone isn't linked. Visit https://wnf.app/profile to link it!");
  return;
}
```

### Interaction Logger

```typescript
/**
 * Log bot interaction to database
 * @param interaction - Interaction details
 */
async function logInteraction(interaction: {
  playerId?: string;
  phoneNumber: string;
  type: 'command' | 'reaction' | 'message';
  command?: string;
  response?: string;
  success: boolean;
  errorMessage?: string;
}) {
  await supabaseService.getClient()
    .from('bot_interactions')
    .insert({
      player_id: interaction.playerId || null,
      phone_number: interaction.phoneNumber,
      interaction_type: interaction.type,
      command: interaction.command || null,
      response: interaction.response || null,
      success: interaction.success,
      error_message: interaction.errorMessage || null
    });
}

// Usage:
await logInteraction({
  playerId: player.id,
  phoneNumber: phone,
  type: 'command',
  command: '/xp',
  response: 'Your XP: 1,234',
  success: true
});
```

---

## Command Handlers

### /xp Command

```typescript
async function handleXPCommand(msg: Message, player: any) {
  try {
    // Get player XP
    const { data, error } = await supabaseService.getClient()
      .from('player_xp')
      .select('xp, rank, rarity')
      .eq('id', player.id)
      .single();

    if (error) throw error;

    const xp = data?.xp || 0;
    const rank = data?.rank || '?';
    const rarity = data?.rarity || 'Common';

    // Format response
    const response = `🎮 *Your XP*\n\nXP: ${xp.toLocaleString()}\nRank: #${rank}\nTier: ${rarity}`;

    // Send reply
    await msg.reply(response);

    // Log interaction
    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/xp',
      response: response,
      success: true
    });

  } catch (error) {
    logger.error('Error handling /xp command:', error);
    await msg.reply('❌ Error fetching XP data. Please try again.');

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/xp',
      success: false,
      errorMessage: error.message
    });
  }
}
```

### /stats Command

```typescript
async function handleStatsCommand(msg: Message, player: any) {
  try {
    // Get player stats
    const { data, error } = await supabaseService.getClient()
      .from('players')
      .select(`
        xp,
        caps,
        current_streak,
        max_streak,
        shield_tokens_available
      `)
      .eq('id', player.id)
      .single();

    if (error) throw error;

    // Calculate win rate (simplified - you may have a view for this)
    const { data: gameHistory } = await supabaseService.getClient()
      .from('game_registrations')
      .select('game_id, team, games(outcome)')
      .eq('player_id', player.id)
      .eq('status', 'selected')
      .not('games.outcome', 'is', null);

    let wins = 0;
    let total = 0;

    gameHistory?.forEach((reg: any) => {
      if (!reg.games?.outcome) return;
      total++;

      const outcome = reg.games.outcome;
      const team = reg.team;

      if (
        (outcome === 'blue_win' && team === 'blue') ||
        (outcome === 'orange_win' && team === 'orange')
      ) {
        wins++;
      }
    });

    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Format response
    const response = [
      `📊 *Stats for ${player.friendly_name}*`,
      '',
      `🎮 XP: ${data.xp?.toLocaleString() || 0}`,
      `🔥 Streak: ${data.current_streak || 0} games`,
      `⭐ Best Streak: ${data.max_streak || 0} games`,
      `🏆 Win Rate: ${winRate}%`,
      `🎯 Caps: ${data.caps || 0}`,
      `🛡️ Shields: ${data.shield_tokens_available || 0}/4`
    ].join('\n');

    await msg.reply(response);

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/stats',
      response: response,
      success: true
    });

  } catch (error) {
    logger.error('Error handling /stats command:', error);
    await msg.reply('❌ Error fetching stats. Please try again.');

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/stats',
      success: false,
      errorMessage: error.message
    });
  }
}
```

### /tokens Command

```typescript
async function handleTokensCommand(msg: Message, player: any) {
  try {
    // Check token status (using existing view)
    const { data, error } = await supabaseService.getClient()
      .from('public_player_token_status')
      .select('*')
      .eq('player_id', player.id)
      .maybeSingle();

    if (error) throw error;

    const hasToken = data?.status === 'AVAILABLE';
    const lastUsed = data?.last_used_at
      ? new Date(data.last_used_at).toLocaleDateString()
      : 'Never';

    // Format response
    const response = [
      `🪙 *Priority Token Status*`,
      '',
      `Status: ${hasToken ? '✅ Available' : '❌ Not Available'}`,
      hasToken ? '' : `Last Used: ${lastUsed}`,
      '',
      `To use your token, react to a game announcement with 👍 and 🪙`
    ].filter(Boolean).join('\n');

    await msg.reply(response);

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/tokens',
      response: response,
      success: true
    });

  } catch (error) {
    logger.error('Error handling /tokens command:', error);
    await msg.reply('❌ Error fetching token status. Please try again.');

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/tokens',
      success: false,
      errorMessage: error.message
    });
  }
}
```

### /shields Command

```typescript
async function handleShieldsCommand(msg: Message, player: any) {
  try {
    // Get shield status
    const { data, error } = await supabaseService.getClient()
      .from('players')
      .select(`
        shield_tokens_available,
        games_played_since_shield_launch,
        shield_active,
        frozen_streak_value
      `)
      .eq('id', player.id)
      .single();

    if (error) throw error;

    const tokensAvailable = data.shield_tokens_available || 0;
    const gamesPlayed = data.games_played_since_shield_launch || 0;
    const gamesUntilNext = Math.max(0, 10 - (gamesPlayed % 10));
    const shieldActive = data.shield_active || false;

    // Format response
    let response = [
      `🛡️ *Shield Token Status*`,
      '',
      `Shields: ${tokensAvailable}/4`,
      `Progress: ${gamesPlayed % 10}/10 games`,
      `Games until next: ${gamesUntilNext}`,
      `Active: ${shieldActive ? '✅ Yes' : '❌ No'}`
    ];

    if (shieldActive && data.frozen_streak_value) {
      response.push('', `Frozen Streak: ${data.frozen_streak_value} games`);
    }

    response.push('', `To use a shield, send the 🛡️ emoji when a game is announced.`);

    const responseText = response.join('\n');
    await msg.reply(responseText);

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/shields',
      response: responseText,
      success: true
    });

  } catch (error) {
    logger.error('Error handling /shields command:', error);
    await msg.reply('❌ Error fetching shield status. Please try again.');

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'command',
      command: '/shields',
      success: false,
      errorMessage: error.message
    });
  }
}
```

### /help Command

```typescript
async function handleHelpCommand(msg: Message) {
  const response = [
    `📋 *Available Commands*`,
    '',
    `/xp - Check your XP`,
    `/stats - View your full stats`,
    `/tokens - Priority token status`,
    `/shields - Shield token status`,
    `/nextgame - Next game info`,
    `/winrate - Win/loss record`,
    `/help - Show this message`,
    '',
    `💡 *Quick Actions*`,
    `👍 - Register for a game`,
    `🪙 - Use priority token (with 👍)`,
    `🛡️ - Use shield token`,
    '',
    `For more help: https://wnf.app/help/whatsapp-bot`
  ].join('\n');

  await msg.reply(response);

  const phone = formatPhoneNumber(msg.from);
  const player = await findPlayerByPhone(phone);

  await logInteraction({
    playerId: player?.id,
    phoneNumber: phone,
    type: 'command',
    command: '/help',
    response: response,
    success: true
  });
}
```

---

## Reaction Handlers

### Registration via 👍

```typescript
async function handleThumbsUpReaction(reaction: any) {
  try {
    const messageId = reaction.messageId;
    const senderId = reaction.senderId;
    const phone = formatPhoneNumber(senderId);

    // 1. Find which game announcement was reacted to
    const { data: botMessage, error: messageError } = await supabaseService.getClient()
      .from('bot_messages')
      .select('game_id')
      .eq('message_id', messageId)
      .eq('message_type', 'announcement')
      .maybeSingle();

    if (messageError || !botMessage) {
      logger.debug('Reaction not on a game announcement');
      return;
    }

    const gameId = botMessage.game_id;

    // 2. Find player
    const player = await findPlayerByPhone(phone);

    if (!player) {
      logger.warn(`Player not found for phone: ${phone}`);
      // Could send help message about linking account
      return;
    }

    // 3. Check if registration window is open
    const { data: game } = await supabaseService.getClient()
      .from('games')
      .select('status, registration_window_start, registration_window_end')
      .eq('id', gameId)
      .single();

    if (!isRegistrationOpen(game)) {
      logger.info(`Registration window closed for game: ${gameId}`);
      return;
    }

    // 4. Check if already registered
    const { data: existing } = await supabaseService.getClient()
      .from('game_registrations')
      .select('id')
      .eq('player_id', player.id)
      .eq('game_id', gameId)
      .maybeSingle();

    if (existing) {
      logger.info(`Player ${player.friendly_name} already registered`);
      return;
    }

    // 5. Check for priority token usage (👍 + 🪙)
    const usingToken = await checkTokenReaction(messageId, senderId);

    if (usingToken) {
      // Use token first
      const { data: tokenUsed } = await supabaseService.getClient()
        .rpc('use_player_token', {
          p_player_id: player.id,
          p_game_id: gameId
        });

      if (!tokenUsed) {
        logger.warn(`Token not available for ${player.friendly_name}`);
        return;
      }
    }

    // 6. Register player
    const { error: regError } = await supabaseService.getClient()
      .from('game_registrations')
      .insert({
        game_id: gameId,
        player_id: player.id,
        status: 'registered',
        using_token: usingToken
      });

    if (regError) {
      logger.error('Error registering player:', regError);
      return;
    }

    logger.info(`✅ ${player.friendly_name} registered for game ${gameId}`);

    // 7. Log interaction
    await logInteraction({
      playerId: player.id,
      phoneNumber: phone,
      type: 'reaction',
      response: `Registered for game${usingToken ? ' (using token)' : ''}`,
      success: true
    });

  } catch (error) {
    logger.error('Error handling thumbs up reaction:', error);

    await logInteraction({
      playerId: undefined,
      phoneNumber: formatPhoneNumber(reaction.senderId),
      type: 'reaction',
      success: false,
      errorMessage: error.message
    });
  }
}

function isRegistrationOpen(game: any): boolean {
  const now = new Date();
  const start = new Date(game.registration_window_start);
  const end = new Date(game.registration_window_end);

  return now >= start && now <= end && game.status === 'open';
}

async function checkTokenReaction(messageId: string, senderId: string): Promise<boolean> {
  // TODO: Implement checking for 🪙 reaction on same message
  // This requires accessing all reactions on the message
  // For now, return false
  return false;
}
```

### Shield Token via 🛡️

```typescript
async function handleShieldMessage(msg: Message, player: any) {
  try {
    // 1. Find next game
    const { data: game } = await supabaseService.getClient()
      .from('games')
      .select('id, date')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!game) {
      await msg.reply('❌ No upcoming games found.');
      return;
    }

    // 2. Use shield token
    const { data: shieldUsed, error } = await supabaseService.getClient()
      .rpc('use_shield_token', {
        p_player_id: player.id,
        p_game_id: game.id,
        p_user_id: player.user_id
      });

    if (error) throw error;

    if (!shieldUsed) {
      await msg.reply('❌ No shield tokens available or already active.');
      return;
    }

    // 3. Get frozen streak info
    const { data: shieldInfo } = await supabaseService.getClient()
      .from('players')
      .select('frozen_streak_value')
      .eq('id', player.id)
      .single();

    const streakValue = shieldInfo?.frozen_streak_value || 0;
    const xpBonus = streakValue * 10;

    const response = [
      `✅ Shield activated!`,
      '',
      `🛡️ Your ${streakValue}-game streak is now frozen`,
      `📈 Streak bonus: +${xpBonus}% XP`,
      '',
      `Your streak won't decrease until you play again.`
    ].join('\n');

    await msg.reply(response);

    // 4. Log interaction
    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'message',
      response: response,
      success: true
    });

  } catch (error) {
    logger.error('Error handling shield message:', error);
    await msg.reply('❌ Error activating shield. Please try again.');

    await logInteraction({
      playerId: player.id,
      phoneNumber: formatPhoneNumber(msg.from),
      type: 'message',
      success: false,
      errorMessage: error.message
    });
  }
}
```

---

## Message Tracking

### Store Sent Message

```typescript
async function sendAndTrackAnnouncement(
  gameId: string,
  messageType: 'announcement' | 'player_selection' | 'team_announcement',
  messageText: string
) {
  try {
    // 1. Send message via WhatsApp
    const message = await whatsappClient.sendMessage(config.groupId, messageText);
    const messageId = message.id._serialized;

    logger.info(`Message sent: ${messageId}`);

    // 2. Store in database
    const { error } = await supabaseService.getClient()
      .from('bot_messages')
      .insert({
        message_id: messageId,
        game_id: gameId,
        message_type: messageType,
        message_content: messageText,
        sent_to: config.groupId,
        success: true
      });

    if (error) {
      logger.error('Error storing message:', error);
    }

    return messageId;

  } catch (error) {
    logger.error('Error sending message:', error);

    // Store failure
    await supabaseService.getClient()
      .from('bot_messages')
      .insert({
        message_id: `failed_${Date.now()}`,
        game_id: gameId,
        message_type: messageType,
        message_content: messageText,
        sent_to: config.groupId,
        success: false,
        error_message: error.message
      });

    throw error;
  }
}
```

### Retrieve Message by ID

```typescript
async function getGameFromMessage(messageId: string): Promise<string | null> {
  const { data, error } = await supabaseService.getClient()
    .from('bot_messages')
    .select('game_id')
    .eq('message_id', messageId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.game_id;
}
```

---

## Error Handling

### Graceful Error Response

```typescript
async function handleCommandSafely(
  msg: Message,
  handler: (msg: Message, player: any) => Promise<void>
) {
  try {
    // 1. Find player
    const phone = formatPhoneNumber(msg.from);
    const player = await findPlayerByPhone(phone);

    if (!player) {
      await msg.reply(
        "❌ Your phone number isn't linked to a player account.\n\n" +
        "Visit https://wnf.app/profile to link your WhatsApp number."
      );

      await logInteraction({
        phoneNumber: phone,
        type: 'command',
        success: false,
        errorMessage: 'Player not linked'
      });
      return;
    }

    // 2. Execute handler
    await handler(msg, player);

  } catch (error) {
    logger.error('Command handler error:', error);

    await msg.reply(
      "❌ An error occurred. Please try again or contact an admin if the problem persists."
    );

    const phone = formatPhoneNumber(msg.from);
    const player = await findPlayerByPhone(phone);

    await logInteraction({
      playerId: player?.id,
      phoneNumber: phone,
      type: 'command',
      success: false,
      errorMessage: error.message
    });
  }
}

// Usage:
client.on('message', async (msg: Message) => {
  const command = msg.body.trim().toLowerCase();

  if (command === '/xp') {
    await handleCommandSafely(msg, handleXPCommand);
  } else if (command === '/stats') {
    await handleCommandSafely(msg, handleStatsCommand);
  }
  // ... etc
});
```

---

## Testing Utilities

### Test Data Generator

```typescript
// Test with real players who have WhatsApp numbers
const TEST_PLAYERS = [
  { name: 'Phil R', phone: '+447561315106' },
  { name: 'Jarman', phone: '+447572235038' },
  { name: 'Jack G', phone: '+447930615734' },
  { name: 'Zhao', phone: '+447875953741' },
  { name: 'Joe', phone: '+447494267678' }
];

async function testPlayerLookup() {
  for (const testPlayer of TEST_PLAYERS) {
    const player = await findPlayerByPhone(testPlayer.phone);
    console.log(`${testPlayer.name}: ${player ? '✅ Found' : '❌ Not found'}`);
  }
}
```

### Mock Message for Testing

```typescript
interface MockMessage {
  from: string;
  body: string;
  reply: (text: string) => Promise<void>;
}

function createMockMessage(phone: string, body: string): MockMessage {
  return {
    from: `${phone.replace('+', '')}@c.us`,
    body: body,
    reply: async (text: string) => {
      console.log(`[Reply to ${phone}]`, text);
    }
  };
}

// Usage:
const mockMsg = createMockMessage('+447561315106', '/xp');
await handleXPCommand(mockMsg, { id: 'test-id', friendly_name: 'Phil R' });
```

### Analytics Queries

```typescript
// Command usage statistics
async function getCommandStats(since: Date) {
  const { data } = await supabaseService.getClient()
    .from('bot_interactions')
    .select('command')
    .eq('interaction_type', 'command')
    .gte('created_at', since.toISOString());

  const counts = {};
  data?.forEach(row => {
    counts[row.command] = (counts[row.command] || 0) + 1;
  });

  return counts;
}

// Error rate by command
async function getErrorRates(since: Date) {
  const { data } = await supabaseService.getClient()
    .from('bot_interactions')
    .select('command, success')
    .eq('interaction_type', 'command')
    .gte('created_at', since.toISOString());

  const stats = {};
  data?.forEach(row => {
    if (!stats[row.command]) {
      stats[row.command] = { total: 0, errors: 0 };
    }
    stats[row.command].total++;
    if (!row.success) {
      stats[row.command].errors++;
    }
  });

  return stats;
}
```

---

## Complete Example: Main Handler

```typescript
import { Message } from 'whatsapp-web.js';
import { supabaseService } from './supabase-client';
import { logger } from './utils/logger';

export class MessageHandler {
  async handleMessage(msg: Message): Promise<void> {
    // Only process group messages from configured group
    if (msg.from !== config.groupId) {
      return;
    }

    const command = msg.body.trim().toLowerCase();

    // Only process commands
    if (!command.startsWith('/')) {
      // Check for shield emoji
      if (command.includes('🛡️')) {
        await this.handleShieldEmoji(msg);
      }
      return;
    }

    // Route to command handler
    switch (command) {
      case '/xp':
        await handleCommandSafely(msg, handleXPCommand);
        break;
      case '/stats':
        await handleCommandSafely(msg, handleStatsCommand);
        break;
      case '/tokens':
        await handleCommandSafely(msg, handleTokensCommand);
        break;
      case '/shields':
        await handleCommandSafely(msg, handleShieldsCommand);
        break;
      case '/help':
        await handleHelpCommand(msg);
        break;
      default:
        await msg.reply("❓ Unknown command. Type /help for available commands.");
    }
  }

  private async handleShieldEmoji(msg: Message): Promise<void> {
    const phone = formatPhoneNumber(msg.from);
    const player = await findPlayerByPhone(phone);

    if (!player) {
      return; // Silently ignore if not linked
    }

    await handleShieldMessage(msg, player);
  }
}
```

---

**Last Updated:** 2025-10-20
**Reference:** WEB_APP_HANDOVER.md
**Next Steps:** Implement these patterns in your Phase 2 code
