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

## Admin Slot Offer Actions

### handle_admin_slot_offer_action Function

The `handle_admin_slot_offer_action` function manages administrative responses to slot offers. This function is critical for maintaining data consistency when admins accept or reject slot offers on behalf of players.

#### Function Parameters
- `p_slot_offer_id` (UUID): The ID of the slot offer being acted upon
- `p_admin_id` (UUID): The ID of the admin taking the action
- `p_action` (TEXT): The action being taken ('accept' or 'reject')

#### Process Flow for Acceptance

1. **Validation**
```sql
-- Check if slot offer exists and is pending
SELECT * INTO v_slot_offer 
FROM slot_offers 
WHERE id = p_slot_offer_id 
AND status = 'pending';

IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot offer not found or not in pending status';
END IF;
```

2. **Game Selections Update**
```sql
-- Check for existing game_selections record
SELECT * INTO v_game_selection
FROM game_selections
WHERE game_id = v_slot_offer.game_id;

IF NOT FOUND THEN
    -- Create new game_selections record with initialized fields
    INSERT INTO game_selections (
        game_id,
        selected_players,
        reserve_players,
        metadata
    ) VALUES (
        v_slot_offer.game_id,
        JSONB_BUILD_ARRAY(),
        JSONB_BUILD_ARRAY(),
        JSONB_BUILD_OBJECT('last_modified_by', p_admin_id)
    );
ELSE
    -- Update existing record
    UPDATE game_selections
    SET metadata = JSONB_SET(
        metadata,
        '{last_modified_by}',
        to_jsonb(p_admin_id)
    )
    WHERE game_id = v_slot_offer.game_id;
END IF;
```

3. **Status Update**
```sql
UPDATE slot_offers
SET 
    status = 'accepted',
    responded_at = CURRENT_TIMESTAMP,
    admin_id = p_admin_id
WHERE id = p_slot_offer_id;
```

### Common Issues and Solutions

#### 1. Game Selections Not-Null Constraint Violation
**Symptom:** Error about null values in the reserve_players column

**Solution:**
- Always initialize reserve_players as an empty JSONB array
- Check for existing record before attempting update
- Use explicit INSERT for new records with all required fields

```sql
-- Correct initialization
INSERT INTO game_selections (
    game_id,
    selected_players,
    reserve_players,  -- Required field
    metadata
) VALUES (
    v_game_id,
    JSONB_BUILD_ARRAY(),
    JSONB_BUILD_ARRAY(),  -- Initialize as empty array
    JSONB_BUILD_OBJECT()
);
```

#### 2. ON CONFLICT Issues
**Symptom:** Error about missing unique constraint for ON CONFLICT clause

**Solution:**
- Avoid using ON CONFLICT for game_selections updates
- Explicitly check for existing records
- Use separate INSERT and UPDATE logic paths

```sql
-- Correct approach
IF EXISTS (SELECT 1 FROM game_selections WHERE game_id = v_game_id) THEN
    -- Update existing record
    UPDATE game_selections SET ...
ELSE
    -- Insert new record
    INSERT INTO game_selections ...
END IF;
```

### Verification Queries

#### Check Slot Offer Status
```sql
SELECT 
    so.id,
    so.status,
    so.created_at,
    so.responded_at,
    so.admin_id,
    p.friendly_name as player_name,
    g.date as game_date
FROM slot_offers so
JOIN players p ON p.id = so.player_id
JOIN games g ON g.id = so.game_id
WHERE so.game_id = [game_id]
ORDER BY so.created_at DESC;
```

#### Verify Game Selections
```sql
SELECT 
    gs.game_id,
    gs.selected_players,
    gs.reserve_players,
    gs.metadata->>'last_modified_by' as last_modified_by,
    g.date as game_date
FROM game_selections gs
JOIN games g ON g.id = gs.game_id
WHERE gs.game_id = [game_id];
```

## Frontend Integration Notes

### Game Identification
When displaying game information in the UI, always use the `sequence_number` field from the games table:

```typescript
interface Game {
  id: string;
  sequence_number: number;  // Use this for display
  date: string;
  // ... other fields
}
```

Common pitfalls:
- Don't use `game_number` - this field doesn't exist in the database schema
- Always handle nullable `sequence_number` with appropriate fallbacks
- Ensure type definitions match database schema exactly

### Component Integration

#### Slot Offer Display Components
The following components handle slot offer display and interactions:

1. `AdminSlotOffers.tsx`
   - Displays slot offers for admin management
   - Uses `sequence_number` for game identification
   - Handles admin accept/decline actions

2. `SlotOfferItem.tsx`
   - Displays individual slot offers
   - Shows game details including sequence number and venue

### Common Integration Issues

#### 1. Schema Mismatches
**Problem:** Frontend type definitions not matching database schema
**Solution:** Always verify type definitions against `Supabase-Database-Info.txt`

Example of correct type definition:
```typescript
export interface SlotOffer {
  id: string;
  game_id: string;
  player_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'voided';
  game: {
    sequence_number: number;  // Correct field name
    // ... other fields
  };
}
```

#### 2. Null Handling
**Problem:** Not handling nullable fields properly
**Solution:** Always use optional chaining and provide fallbacks

```typescript
// Correct approach
<p>Game #{offer.game?.sequence_number || 'N/A'}</p>

// Incorrect approach
<p>Game #{offer.game.sequence_number}</p>  // May cause runtime errors
```

#### 3. RPC Function Parameters
When calling the `handle_admin_slot_offer_action` function, ensure parameters match exactly:

```typescript
const { error } = await supabase.rpc('handle_admin_slot_offer_action', {
  p_slot_offer_id: slotOfferId,  // Must match parameter name in function
  p_action: action,
  p_admin_id: adminId
});
```

### Database Schema Dependencies
The slot offer system relies on these key tables and fields:

1. `games`
   - `id` (UUID)
   - `sequence_number` (integer) - Used for display and ordering
   - `date` (timestamp with time zone)

2. `slot_offers`
   - `id` (UUID)
   - `game_id` (UUID, references games.id)
   - `status` (text)
   - `player_id` (UUID, references players.id)

3. `game_selections`
   - `game_id` (UUID, references games.id)
   - `selected_players` (JSONB)
   - `reserve_players` (JSONB)
   - `metadata` (JSONB)

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
ORDER BY xp DESC, created_at ASC  // Missing WhatsApp priority!
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

## Best Practices

1. **Transaction Management**
   - Always wrap slot offer actions in transactions
   - Include both slot_offers and game_selections updates in the same transaction
   - Roll back on any failure to maintain consistency

2. **Metadata Tracking**
   - Record admin actions in metadata
   - Include timestamps for audit trails
   - Store relevant context for troubleshooting

3. **Error Handling**
   - Use specific error messages for different failure cases
   - Log all admin actions for accountability
   - Implement proper cleanup on failure

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