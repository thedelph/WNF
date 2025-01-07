# Slot Offer Function Logic Documentation

## Overview
The `create_slot_offers_for_game` function is a PostgreSQL stored procedure that manages the creation and distribution of slot offers when a player drops out of a game. This document provides a detailed explanation of how the function works.

## Function Parameters
- `p_game_id` (UUID): The ID of the game where a slot has opened up
- `p_admin_id` (UUID): The ID of the admin initiating the slot offer process
- `p_dropped_out_player_id` (UUID): The ID of the player who dropped out

## Detailed Process Flow

### 1. Initial Validation
```sql
SELECT * INTO v_game FROM games WHERE id = p_game_id;
IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
END IF;
```
- Verifies that the game exists in the database
- Raises an exception if the game is not found

### 2. Pending Offer Check
```sql
SELECT * INTO v_existing_offer 
FROM slot_offers 
WHERE game_id = p_game_id 
AND status = 'pending';
```
- Checks if there's already a pending offer for this game
- Only one pending offer is allowed at a time
- If a pending offer exists, the function returns early

### 3. Player Selection Logic
```sql
WITH PlayerXP AS (
    SELECT 
        p.id as player_id,
        p.friendly_name,
        p.whatsapp_group_member,
        ps.xp as player_xp,
        p.current_streak,
        p.caps,
        gr.created_at,
        ROW_NUMBER() OVER (
            ORDER BY 
                CASE WHEN p.whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END ASC,
                ps.xp DESC,
                p.current_streak DESC,
                p.caps DESC,
                gr.created_at ASC
        ) as rank
    FROM players p
    JOIN game_registrations gr ON gr.player_id = p.id
    JOIN player_stats ps ON ps.id = p.id
    LEFT JOIN slot_offers so ON so.player_id = p.id 
        AND so.game_id = p_game_id 
        AND so.status IN ('pending', 'declined')
    WHERE gr.game_id = p_game_id
    AND gr.status = 'reserve'
    AND so.id IS NULL
)
```
#### Selection Criteria (in priority order):
1. WhatsApp Member Status:
   - WhatsApp members (Yes/Proxy) get priority over non-members
   - This is the primary sorting criterion
2. Experience Points (XP):
   - Within each WhatsApp group, higher XP gets priority
3. Current Streak:
   - For players with equal XP, higher streak gets priority
4. Total Caps:
   - For players with equal streak, more caps gets priority
5. Registration Time:
   - For players with equal caps, earlier registration wins

This prioritization ensures:
- WhatsApp members always get offers before non-WhatsApp members
- Within each group (WhatsApp/non-WhatsApp), the most experienced and active players get priority
- The system is completely deterministic with clear tiebreakers

### 4. Time Window Calculation
```sql
v_game_date := date_trunc('day', v_game.date) + interval '1 minute';
v_total_time := v_game_date - CURRENT_TIMESTAMP;
v_interval := v_total_time / (v_player_count + 1);
```
#### Time Management:
- Calculates total available time until game starts
- Divides time fairly among all reserve players
- Each player gets an equal portion of the remaining time
- Formula: `time_window = total_time / (number_of_reserves + 1)`

### 5. Slot Offer Creation
```sql
INSERT INTO slot_offers (
    game_id,
    player_id,
    status,
    rank,
    available_at,
    expires_at
) VALUES (
    p_game_id,
    v_highest_xp_player.player_id,
    'pending',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + v_interval
)
```
#### Offer Details:
- Status starts as 'pending'
- Rank is set to 1 (first offer)
- Available immediately (CURRENT_TIMESTAMP)
- Expires after calculated interval

### 6. Notification System

#### Player Notification
```sql
INSERT INTO notifications (
    player_id,
    type,
    message,
    metadata,
    title,
    priority
)
```
- Type: 'slot_offer'
- Priority: 2 (high priority)
- Includes:
  - Game date
  - Expiration time
  - Exclusive access period

#### Admin Notification
```sql
INSERT INTO notifications (
    player_id,
    type,
    message,
    metadata,
    title,
    priority
)
```
- Type: 'system_announcement'
- Priority: 1
- Sent to all admins
- Includes:
  - Selected player's name
  - Game date
  - Action type

## Function Interactions and Troubleshooting

### Related Functions
The slot offer system relies on two key functions that must maintain consistent selection logic:

1. `create_slot_offers_for_game`:
   - Creates initial slot offers when a player drops out
   - Uses WhatsApp priority and XP-based sorting

2. `get_next_slot_offer_players`:
   - Called by `handle_slot_offer_response` when a player declines
   - Must use identical priority logic to maintain consistency

### Common Issues

#### Inconsistent Priority Logic
A common issue is when `get_next_slot_offer_players` and `create_slot_offers_for_game` have different sorting logic:

```sql
-- Correct logic (both functions should use this):
ORDER BY 
    CASE WHEN p.whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END ASC,
    ps.xp DESC,
    p.current_streak DESC,
    p.caps DESC,
    gr.created_at ASC

-- Wrong logic (can appear in get_next_slot_offer_players):
ORDER BY xp DESC, created_at ASC  -- Missing WhatsApp priority!
```

#### Symptoms:
- WhatsApp priority works for initial offers but not after declines
- Non-WhatsApp members with high XP getting offers before WhatsApp members
- Inconsistent offer sequence after player declines

#### Verification Query
To verify the current state of offers and priorities:
```sql
SELECT 
    so.created_at,
    p.friendly_name,
    p.whatsapp_group_member,
    ps.xp,
    so.status,
    p.current_streak,
    p.caps
FROM slot_offers so
JOIN players p ON p.id = so.player_id
JOIN player_stats ps ON ps.id = p.id
WHERE so.game_id = [game_id]
ORDER BY so.created_at ASC;
```

This query helps verify:
- Correct offer sequence
- WhatsApp priority enforcement
- XP-based ordering within groups
- Timing of offers and responses

### Testing Priority Logic
When testing priority changes:
1. Create a new game or use an existing one
2. Have a player drop out
3. Monitor the sequence of offers
4. Pay special attention to cases where:
   - High-XP non-WhatsApp members are in reserves
   - Multiple declines trigger new offers
   - Mix of WhatsApp and non-WhatsApp members with various XP levels

## Detailed Troubleshooting Guide

### Step 1: Check Current Game State
First, get the current game registrations to understand the player pool:

```sql
SELECT 
    p.friendly_name,
    p.whatsapp_group_member,
    ps.xp,
    gr.status,
    p.current_streak,
    p.caps,
    gr.created_at
FROM game_registrations gr
JOIN players p ON p.id = gr.player_id
JOIN player_stats ps ON ps.id = p.id
WHERE gr.game_id = (
    SELECT id FROM games 
    WHERE date > CURRENT_TIMESTAMP
    ORDER BY date ASC 
    LIMIT 1
)
ORDER BY 
    CASE WHEN p.whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END ASC,
    ps.xp DESC;
```

This query helps you:
- See all players' WhatsApp status and XP
- Identify reserves vs selected players
- Understand the potential offer sequence

### Step 2: Get Game ID
When troubleshooting specific games:

```sql
SELECT id, date 
FROM games 
WHERE date > CURRENT_TIMESTAMP
ORDER BY date ASC 
LIMIT 1;
```

### Step 3: Analyze Current Offers
Track the sequence of offers and responses:

```sql
WITH ranked_offers AS (
    SELECT 
        so.created_at,
        p.friendly_name,
        p.whatsapp_group_member,
        ps.xp,
        so.status,
        p.current_streak,
        p.caps,
        LAG(p.friendly_name) OVER (ORDER BY so.created_at) as previous_offer
    FROM slot_offers so
    JOIN players p ON p.id = so.player_id
    JOIN player_stats ps ON ps.id = p.id
    WHERE so.game_id = '[game_id]'
    ORDER BY so.created_at ASC
)
SELECT 
    created_at,
    friendly_name,
    whatsapp_group_member,
    xp,
    status,
    previous_offer
FROM ranked_offers;
```

This enhanced query shows:
- Chronological offer sequence
- Who received offers after each decline
- Any priority violations (non-WhatsApp before WhatsApp)

### Step 4: Check Expected Next Offer
Before making changes, verify who should get the next offer:

```sql
SELECT 
    p.friendly_name,
    p.whatsapp_group_member,
    ps.xp,
    p.current_streak,
    p.caps
FROM game_registrations gr
JOIN players p ON p.id = gr.player_id
JOIN player_stats ps ON ps.id = p.id
WHERE gr.game_id = '[game_id]'
AND gr.status = 'reserve'
AND NOT EXISTS (
    SELECT 1 
    FROM slot_offers so 
    WHERE so.game_id = gr.game_id 
    AND so.player_id = p.id 
    AND so.status IN ('pending', 'declined')
)
ORDER BY 
    CASE WHEN p.whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END ASC,
    ps.xp DESC,
    p.current_streak DESC,
    p.caps DESC,
    gr.created_at ASC
LIMIT 1;
```

### Common Scenarios and Solutions

#### Scenario 1: High-XP Non-WhatsApp Member Getting Early Offers
Example: Carlton (76 XP, non-WhatsApp) getting offers before WhatsApp members

**Symptoms:**
- Non-WhatsApp members with high XP receiving offers too early
- WhatsApp priority not being respected after declines

**Solution:**
1. Check both functions for consistent priority logic
2. Ensure WhatsApp sorting is first priority in both functions
3. Verify the WHERE clause isn't excluding valid WhatsApp members

#### Scenario 2: Offer Sequence Breaks After Decline
Example: Correct initial offer to Alex E (WhatsApp, 202 XP) but incorrect next offer

**Investigation Steps:**
1. Check offer history using the ranked_offers query above
2. Verify `handle_slot_offer_response` is using correct function
3. Ensure both functions share identical priority logic

#### Scenario 3: Multiple Simultaneous Offers
**Symptoms:**
- Multiple pending offers for same game
- Offers not following priority sequence

**Solution:**
1. Check pending offer locks in both functions
2. Verify transaction handling
3. Ensure proper status checking in WHERE clauses

### Real-World Test Case
From our testing session:
1. Initial State:
   - Alex E (WhatsApp, 202 XP)
   - Mike B (WhatsApp, 192 XP)
   - Carlton (Non-WhatsApp, 76 XP)
   
2. Correct Sequence Observed:
   - Alex E → Declined
   - Mike B → Declined
   - Tom K → Declined
   - Simon → Declined
   - Lee S → Declined
   - Lewis → Declined
   - Ethan → Declined
   - Anthony B → Declined
   - Adrian P → Declined
   - Ben W → Declined
   - Chris F → Declined
   - Carlton → Declined
   - Joe → Accepted

This sequence confirmed correct priority handling through multiple declines.

## Error Handling
- Game not found: Raises exception
- No eligible players: Logs message and returns
- Existing pending offer: Logs message and returns

## Important Notes
1. Only one pending offer can exist at a time
2. Players with higher XP get priority
3. Time windows are calculated dynamically
4. System maintains full audit trail through notifications
5. Both players and admins are kept informed of all actions

## Related Tables
- `games`: Game information
- `players`: Player details
- `game_registrations`: Player registration status
- `slot_offers`: Offer tracking
- `notifications`: Communication system
- `player_stats`: XP and player statistics