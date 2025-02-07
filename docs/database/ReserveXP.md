# Reserve XP Database Components

## Tables

### reserve_xp_transactions
Stores all reserve-related XP transactions for players.

```sql
CREATE TABLE reserve_xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    game_id UUID REFERENCES games(id),
    xp_amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Columns
- `id`: Unique identifier for the transaction
- `player_id`: Reference to the player
- `game_id`: Reference to the game
- `xp_amount`: Amount of XP (+5 for being reserve, -10 for declining)
- `transaction_type`: Type of transaction ('RESERVE_REWARD' or 'RESERVE_PENALTY')
- `created_at`: Timestamp of the transaction

## Views

### player_xp_breakdown
A materialized view that provides a comprehensive breakdown of a player's XP, including reserve XP and games.

#### Columns
- `friendly_name`: Player's friendly name (used for querying)
- `reserve_xp`: Total XP earned/lost from reserve status
- `reserve_games`: Number of times player has been a reserve
- `reserve_game_modifier`: Modifier applied to XP based on reserve status
- `total_xp`: Total XP after all modifiers

#### Usage
```typescript
// Example: Fetching reserve XP data
const { data } = await supabase
  .from('player_xp_breakdown')
  .select('reserve_games, reserve_xp')
  .eq('friendly_name', playerName)
  .single();
```

Note: Query this view using `friendly_name` rather than `player_id` as it's denormalized for performance.

## Functions

### get_player_with_reserve_xp
Returns player data including aggregated reserve XP information.

```sql
CREATE OR REPLACE FUNCTION get_player_with_reserve_xp(p_player_id UUID)
RETURNS TABLE (
    id UUID,
    friendly_name TEXT,
    avatar_svg TEXT,
    caps INTEGER,
    active_bonuses INTEGER,
    active_penalties INTEGER,
    current_streak INTEGER,
    max_streak INTEGER,
    win_rate NUMERIC,
    xp INTEGER,
    user_id UUID,
    reserve_xp INTEGER,
    reserve_count INTEGER
) 
SECURITY DEFINER
```

#### Parameters
- `p_player_id`: UUID of the player to get data for

#### Returns
- Player's basic information
- Aggregated XP data
- Total reserve XP
- Count of times being a reserve

#### Security
- Function runs with SECURITY DEFINER to bypass RLS
- Accessible to authenticated users
- Safe aggregation of sensitive data

## RLS Policies

### reserve_xp_transactions
```sql
-- Players can view their own XP transactions
CREATE POLICY "Players can view their own XP transactions"
ON reserve_xp_transactions
FOR SELECT
TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = reserve_xp_transactions.player_id
    )
);

-- Admins can manage all XP transactions
CREATE POLICY "Admins can manage all XP transactions"
ON reserve_xp_transactions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN players p ON p.id = ar.player_id
        JOIN admin_permissions ap ON ar.id = ap.admin_role_id
        WHERE p.user_id = auth.uid() 
        AND ap.permission = 'MANAGE_XP'
    )
);
```
