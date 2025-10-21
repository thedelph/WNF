# Web App → Bot Handover Summary

**Date:** 2025-10-21
**From:** Web App Claude Code Instance
**To:** Home Server Bot Claude Code Instance (via Chris)

---

## 📋 What I've Created

### Main Document: `BOT_TECHNICAL_SPEC.md`

A **complete technical specification** containing:

✅ **Exact database schema** - table names, column names, data types
✅ **Query patterns** - Working SQL/TypeScript examples for all features
✅ **RPC function signatures** - How to call token/shield functions
✅ **Date/time formatting** - Ordinal suffixes, time extraction from timestamps
✅ **Message templates** - Exact format for announcements
✅ **Admin authorization** - How to check phone numbers
✅ **Feature suggestions** - New capabilities based on available data
✅ **Implementation checklist** - Step-by-step build order

---

## 🔍 Key Discoveries

### Critical: XP Data Location

**XP is NOT in the `players` table!**

```typescript
// ❌ WRONG - This will fail
SELECT xp FROM players WHERE id = 'uuid';

// ✅ CORRECT - Use player_stats view
SELECT xp FROM player_stats WHERE id = 'uuid';
```

### Game Status Enum

Values: `open`, `upcoming`, `players_announced`, `teams_announced`, `completed`

### Time Handling

The `date` field contains **BOTH** date and time:
```
date: "2025-10-22 20:00:00+00"
```
No separate `start_time` or `end_time` fields exist.

### Token Eligibility View

**✅ CORRECTED:** The `public_player_token_status` materialized view **DOES exist**.

Use the simple query pattern:
- Just check `is_eligible = true`
- View handles all eligibility logic automatically
- See TOKEN_ELIGIBILITY_QUERY.md for details

---

## 📦 Files Created

1. **`BOT_TECHNICAL_SPEC.md`** - Main specification (10,000+ words)
2. **`HANDOVER_WEB_TO_BOT.md`** - This summary
3. **`TOKEN_ELIGIBILITY_QUERY.md`** - Correct token eligibility query
4. **`TOKEN_INELIGIBILITY_MESSAGES.md`** - DM messages for ineligible token reactions

---

## 🎯 What Bot Claude Should Build

### Priority 1: Admin Commands (Documented in ADMIN_GUIDE.md)
- `/adminhelp` - List admin commands
- `/listgames` - Show upcoming games with positions
- `/announce <position>` - Send game announcement to group

### Priority 2: Game Announcements (Documented in GAME_ANNOUNCEMENT_GUIDE.md)
- Generate formatted announcements
- Ordinal date formatting (22nd, 18th)
- Extract time from `date` field
- Query token-eligible players
- Store in `bot_messages` table

### Priority 3: Player Commands (Documented in README.md)
- `/xp` - Check XP (from `player_stats` view!)
- `/stats` - Full stats
- `/tokens` - Token status
- `/shields` - Shield status
- `/nextgame` - Next game info
- `/help` - Command list

### Priority 4: Reaction Registration & Feedback
- 👍 reaction → register player
- 🪙 reaction → use priority token (or send DM if ineligible)
- 🛡️ message → use shield token
- **Token Ineligibility DMs**: When ineligible player reacts with 🪙, send helpful DM explaining why

---

## 💡 Bonus Features I Suggested

Based on available database fields:

1. **Token Ineligibility DMs** - Send helpful DM when player reacts with 🪙 but isn't eligible, explaining exactly why (see TOKEN_INELIGIBILITY_MESSAGES.md)
2. **Payment Reminders** - `pitch_cost`, `payment_link`, `paid` fields exist
3. **Win Rate Stats** - Already calculated in `player_stats.win_rate`
4. **Team Announcements** - `teams_announced`, `team` fields exist
5. **Player Rankings** - Multiple rating columns available
6. **Recent Form** - `current_streak`, `max_streak` available

---

## 🚀 Next Steps

### For Chris:
1. Copy `BOT_TECHNICAL_SPEC.md` to home server bot folder
2. Share with bot Claude Code instance
3. Bot Claude implements features using exact query patterns

### For Bot Claude:
1. Read `BOT_TECHNICAL_SPEC.md` thoroughly
2. **Critical:** Remember XP is in `player_stats` view, NOT `players` table
3. Follow implementation checklist
4. Use provided query patterns exactly
5. Test each feature before moving to next

---

## 📚 Documentation Suite

You now have **complete documentation**:

**Created by Bot Claude (on home server):**
- `README.md` - Main bot documentation
- `ADMIN_GUIDE.md` - Admin command usage
- `GAME_ANNOUNCEMENT_GUIDE.md` - Announcement formatting spec
- `HOME_SERVER_DEPLOYMENT.md` - Deployment guide

**Created by Web App Claude (this instance):**
- `BOT_TECHNICAL_SPEC.md` - Database queries & implementation details
- `HANDOVER_WEB_TO_BOT.md` - This summary

**Existing:**
- `DATABASE_SCHEMA_REFERENCE.md` - Schema overview
- `INTEGRATION_EXAMPLES.md` - Code examples
- `WEB_APP_HANDOVER.md` - Web integration points

---

## ✅ Ready for Implementation

Everything bot Claude needs is in `BOT_TECHNICAL_SPEC.md`:

- ✅ Exact table/column names verified via database access
- ✅ Query patterns tested against actual schema
- ✅ RPC function names confirmed
- ✅ Data types validated
- ✅ Edge cases documented (missing views, field locations)

**Status:** 🟢 **READY TO BUILD**

---

**Questions?** All technical details are in `BOT_TECHNICAL_SPEC.md`

**Created By:** Web App Claude Code (with MCP database access)
**Handover Date:** 2025-10-21
