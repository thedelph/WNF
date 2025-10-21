# Admin Commands Guide

**Last Updated:** 2025-10-21

This guide explains how to use admin commands to manage game announcements via WhatsApp Direct Messages.

---

## Overview

Admins can control the bot by sending **private messages (DMs)** directly to the bot's WhatsApp number. Admin commands do NOT work in the group chat.

### Key Features

- 📋 List upcoming games
- 📢 Send game announcements to the group
- 🔐 Phone number-based authentication
- 📍 Position-based game selection (easier than UUIDs)

---

## Setup

### Configure Admin Phone Numbers

Admin access is controlled via the `ADMIN_PHONE_NUMBERS` environment variable.

**Format:** E.164 international format (with country code, no spaces)

```env
# Single admin
ADMIN_PHONE_NUMBERS=+447400055259

# Multiple admins (comma-separated)
ADMIN_PHONE_NUMBERS=+447400055259,+447123456789
```

**Examples:**
- UK: `+447400055259`
- US: `+15551234567`
- Spain: `+34612345678`

### Update Configuration

**Via `.env` file:**
```bash
nano .env
# Add your phone number to ADMIN_PHONE_NUMBERS
# Save and restart container
docker-compose restart
```

**Via Portainer:**
1. Stacks → `wnf-whatsapp-bot` → Editor
2. Update `ADMIN_PHONE_NUMBERS` environment variable
3. Click "Update the stack"

---

## Available Commands

### `/adminhelp`

Shows list of all admin commands with examples.

**Usage:**
```
/adminhelp
```

**Response:**
```
🔧 WNF Bot - Admin Commands

📋 Game Management
/listgames - List all upcoming games
/announce <position> - Announce a game to the group

📝 Usage Examples
/listgames - See all upcoming games
/announce 1 - Announce the 1st game in the list
/announce 2 - Announce the 2nd game in the list

💡 Send these commands as a DM to the bot.
💡 Use the list position (1, 2, 3...), not the game number!
```

---

### `/listgames`

Shows all upcoming games with their list positions and details.

**Usage:**
```
/listgames
```

**Response:**
```
📋 Upcoming Games

1. WNF #69
   📅 Wed, 22 Oct 2025 at 21:00
   🎮 Status: open
   📝 Reg: 15:00 - 13:00

2. WNF #70
   📅 Wed, 29 Oct 2025 at 21:00
   🎮 Status: scheduled
   📝 Reg: 15:00 - 13:00

Use /announce <position> to announce a game.
Example: /announce 1 to announce WNF #69
```

**What the fields mean:**
- **Position number** (1, 2, 3) - Use this for `/announce`
- **WNF #69** - The actual game sequence number
- **Date/time** - When the game takes place
- **Status** - Game status (open, scheduled, etc.)
- **Reg** - Registration window times

---

### `/announce <position>`

Sends a formatted game announcement to the WhatsApp group.

**Usage:**
```
/announce <position>
```

**Examples:**
```
/announce 1    # Announce the 1st game in the list
/announce 2    # Announce the 2nd game in the list
```

**What it does:**
1. Fetches game details from database
2. Fetches venue information
3. Fetches token-eligible players
4. Formats announcement message
5. Sends to WhatsApp group
6. Tracks message in database

**Announcement Format:**
```
📅 Wednesday 22nd October
⏰ 9:00pm - 10:00pm
🎮 WNF #69
📍 Partington Sports Village
📍 https://maps.app.goo.gl/WD1NeKbydsZ1w5NfA
🔗 Game Details: https://wnf.app/games
⚽ 18 players / 9-a-side

🎮 Registration is OPEN!
Register your interest by reacting with a thumbs up 👍

Reply to this message with names of any reserves outside of this group that want to play.

The following players, react with 🪙 if you want to guarantee a spot this week (but you likely won't get a spot next week):

🪙 Player 1
🪙 Player 2

Registration closes Saturday 18th October at 1:00pm
```

**Success Response:**
```
✅ Game announcement sent successfully!

🎮 WNF #69
📅 22 Oct at 9:00pm
🆔 Message ID: true_120363...@lid

📊 2 token-eligible player(s) listed

The message is now being tracked for 👍 and 🪙 reactions.
```

---

## How to Use Admin Commands

### Step 1: Open WhatsApp

Open WhatsApp on your phone (the one configured in `ADMIN_PHONE_NUMBERS`).

### Step 2: Start DM with Bot

1. Find the bot's WhatsApp contact (the number you scanned QR code with)
2. Open a **private chat** (NOT the group)

### Step 3: Send Command

Type the command and send:

```
/listgames
```

### Step 4: Get Response

Bot will respond immediately with the requested information.

---

## Common Workflows

### Announcing a New Game

**Scenario:** You've created WNF #69 in the database and want to announce it to the group.

**Steps:**

1. **Check upcoming games:**
   ```
   /listgames
   ```

2. **Find the game:**
   ```
   📋 Upcoming Games

   1. WNF #69          <-- This is the one we want
      📅 Wed, 22 Oct 2025 at 21:00
      🎮 Status: open
      📝 Reg: 15:00 - 13:00
   ```

3. **Announce the game:**
   ```
   /announce 1         <-- Use position 1
   ```

4. **Verify success:**
   - Check bot's response for ✅ confirmation
   - Check WhatsApp group for announcement message
   - Verify players can react with 👍

### Announcing Multiple Games

**Scenario:** You have 3 games to announce.

**Steps:**

1. **List all games:**
   ```
   /listgames
   ```

2. **Announce first game:**
   ```
   /announce 1
   ```

3. **Wait for confirmation**, then announce second:
   ```
   /announce 2
   ```

4. **Continue for remaining games**

**Important:** Wait for each announcement to complete before sending the next one to avoid conflicts.

---

## Important Notes

### Position vs Game Number

⚠️ **USE LIST POSITIONS, NOT GAME NUMBERS!**

**Correct:**
```
/listgames             # Shows position 1 = WNF #69
/announce 1            # Uses position 1 ✅
```

**Incorrect:**
```
/listgames             # Shows position 1 = WNF #69
/announce 69           # Tries to find position 69 ❌
```

**Why?**
- List positions are dynamic (1, 2, 3...)
- Game sequence numbers are fixed (#69, #70, #71...)
- Commands use **positions** for simplicity

### Commands Only Work in DM

Admin commands **ONLY work** when sent as a **private message** to the bot.

✅ **Correct:** DM to bot
```
You → Bot (DM)
/announce 1
```

❌ **Incorrect:** Group message
```
Group Chat
/announce 1
(No response - command ignored)
```

### Authentication

Only phone numbers listed in `ADMIN_PHONE_NUMBERS` can use admin commands.

**What happens if unauthorized user tries:**
- Command is ignored
- No response sent
- Action logged (for security monitoring)

---

## Troubleshooting

### "Game #X not found"

**Error Message:**
```
❌ Game #69 not found. Only 1 upcoming game(s) available.

Use `/listgames` to see all games.
```

**Cause:** You used a game sequence number instead of list position.

**Solution:**
1. Run `/listgames` to see positions
2. Use the position number (1, 2, 3...) not game number (#69)
3. Example: `/announce 1` not `/announce 69`

---

### "No upcoming games found"

**Error Message:**
```
❌ No upcoming games found.

Use `/listgames` to see available games.
```

**Cause:** No games have status='open' and date >= today.

**Solution:**
1. Check database - are there upcoming games?
2. Verify game status is 'open'
3. Verify game date is in the future

---

### "Group ID not configured"

**Error Message:**
```
❌ Group ID not configured. Set WA_GROUP_ID in .env file.
```

**Cause:** `WA_GROUP_ID` environment variable is not set.

**Solution:**
1. Send a message to the WhatsApp group
2. Check bot logs for group ID (format: `12036...@g.us`)
3. Set `WA_GROUP_ID` in environment variables
4. Restart bot container

---

### Command Not Responding

**Symptom:** You send `/adminhelp` but bot doesn't respond.

**Possible Causes:**

1. **Not sent as DM:**
   - Check you're in a private chat, not group
   - Solution: Open DM with bot

2. **Phone number not configured:**
   - Check your number is in `ADMIN_PHONE_NUMBERS`
   - Format must be E.164 (e.g., `+447400055259`)
   - Solution: Add your number and restart bot

3. **Bot not connected:**
   - Check bot logs: `docker logs wnf-whatsapp-bot`
   - Look for: `✅ WhatsApp client is ready!`
   - Solution: Check WhatsApp authentication

4. **Wrong phone number:**
   - Verify you're using the phone configured in `ADMIN_PHONE_NUMBERS`
   - Check for typos in environment variable
   - Solution: Correct the phone number and restart

---

## Security Considerations

### Phone Number Verification

The bot verifies admin access by checking the sender's phone number in E.164 format.

**How it works:**
1. Bot receives message
2. Extracts sender's phone number
3. Checks if number is in `ADMIN_PHONE_NUMBERS` list
4. If match: Process command
5. If no match: Ignore message

### Best Practices

1. **Limit admin access:**
   - Only add trusted phone numbers
   - Remove phone numbers when no longer needed

2. **Protect environment variables:**
   - Never commit `.env` to git
   - Use secure environment variable management
   - Restrict file permissions: `chmod 600 .env`

3. **Monitor admin actions:**
   - All admin commands are logged
   - Check logs regularly for suspicious activity

4. **Keep phone numbers updated:**
   - Update `ADMIN_PHONE_NUMBERS` when admins change
   - Test access after updates

---

## Examples

### Example 1: Announcing Game #69

```
You: /listgames

Bot: 📋 Upcoming Games

1. WNF #69
   📅 Wed, 22 Oct 2025 at 21:00
   🎮 Status: open
   📝 Reg: 15:00 - 13:00

Use /announce <position> to announce a game.

You: /announce 1

Bot: ✅ Game announcement sent successfully!

🎮 WNF #69
📅 22 Oct at 9:00pm
🆔 Message ID: true_120363...@lid

📊 2 token-eligible player(s) listed

The message is now being tracked for 👍 and 🪙 reactions.
```

### Example 2: Getting Help

```
You: /adminhelp

Bot: 🔧 WNF Bot - Admin Commands

📋 Game Management
/listgames - List all upcoming games
/announce <position> - Announce a game to the group

📝 Usage Examples
/listgames - See all upcoming games
/announce 1 - Announce the 1st game in the list
/announce 2 - Announce the 2nd game in the list

💡 Send these commands as a DM to the bot.
💡 Use the list position (1, 2, 3...), not the game number!
```

---

## Technical Details

### Message Tracking

When you announce a game, the bot stores tracking data:

```sql
INSERT INTO bot_messages (
  message_id,
  game_id,
  message_type,
  message_content,
  sent_to,
  success
)
VALUES (
  'true_120363...@lid',
  'game-uuid',
  'announcement',
  'full announcement text',
  'group-id@g.us',
  true
);
```

**Why track messages?**
- Enables reaction-based registration (👍)
- Prevents duplicate announcements
- Provides audit trail
- Allows analytics

### Announcement Generation

The bot generates announcements by:

1. **Fetching game data:**
   - Game details (date, max players, venue)
   - Venue information (name, Google Maps URL)
   - Token-eligible players

2. **Formatting:**
   - Dates with ordinal suffixes (22nd, 18th)
   - 12-hour time format (9:00pm)
   - Emoji icons for visual clarity

3. **Sending:**
   - Posts to WhatsApp group
   - Tracks message ID
   - Confirms delivery

---

## Related Documentation

- **Main README:** `/README.md`
- **Game Announcement Guide:** `/GAME_ANNOUNCEMENT_GUIDE.md`
- **Deployment Guide:** `/HOME_SERVER_DEPLOYMENT.md`

---

## Support

**Having issues?**

1. Check this guide first
2. Review bot logs: `docker logs wnf-whatsapp-bot`
3. Verify environment variables
4. Test with `/adminhelp` first

**Still stuck?**

Include in your report:
- Command you tried
- Bot's response (or no response)
- Relevant log excerpts
- Your phone number format (hide last 4 digits)

---

**Last Updated:** 2025-10-21
**Version:** 1.0
**Status:** Production Ready
