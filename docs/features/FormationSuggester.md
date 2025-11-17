# Formation Suggester System

## Overview
An intelligent formation suggestion system that analyzes team composition and assigns players to optimal positions based on peer-rated position consensus data and playstyle attributes. The system prioritizes position consensus (peer ratings from teammates) as the primary source, with automatic fallback to 6 derived attributes (Pace, Shooting, Passing, Dribbling, Defending, Physical) when consensus data is unavailable. All formations are outfield-only (GK: 0) to support the rotating goalkeeper system, ensuring every player has a tactical position when not in goal.

## Core Concepts

### Position Detection Priority (Updated Nov 17, 2025)

The system uses a three-tier priority system for determining player positions:

**1. Position Consensus (Peer Ratings) - PRIMARY SOURCE**
- Peer-validated position data from teammates who play together weekly
- Currently 94% of players (17/18) have position consensus data
- Contributes **40% of total position score** when available
- Most reliable source as it reflects real-world playing experience

**2. Playstyle Attributes - SECONDARY SOURCE**
- Derived from 6 playstyle attributes (Pace, Shooting, Passing, Dribbling, Defending, Physical)
- Used when position consensus unavailable or weak
- Contributes **40% of total position score** (60% if no consensus data)
- Algorithmic detection based on attribute combinations

**3. Core Ratings - FALLBACK SOURCE**
- Attack, Defense, Game IQ ratings
- Used as final fallback or supplementary data
- Contributes **20% of total position score** (40% if no consensus data)

**Priority Flow:**
```
Has Position Consensus? → YES → Use consensus (40%) + attributes (40%) + ratings (20%)
                        → NO  → Use attributes (60%) + ratings (40%)
```

### 6-Attribute Position Scoring
Each position has weighted requirements for the 6 attributes:
- **ST (Striker)**: Shooting 35%, Pace 25%, Dribbling 20%, Physical 10%
- **CAM (Attacking Mid)**: Passing 35%, Dribbling 25%, Shooting 20%
- **CM (Central Mid)**: Passing 35%, Physical 20%, Defending 15%
- **CDM (Defensive Mid)**: Defending 30%, Physical 25%, Passing 20%
- **W (Winger)**: Pace 35%, Dribbling 30%, Crossing/Passing 15%
- **DEF (Defender)**: Defending 40%, Physical 30%, Pace 10%

### Position Consensus System (Added Nov 17, 2025)

**Primary Position Detection Method**

When available, position consensus data from peer ratings determines ideal positions:

**Position Consensus Scoring:**
- **Primary Position Match** (≥50% consensus): **7.0-10.0 points** (scales with consensus %)
  - Example: "RW 75%" = 8.75 points for W position
- **Secondary Position Match** (25-49% consensus): **5.0-7.0 points**
  - Example: "CAM 30%" = 5.6 points for CAM position
- **No Consensus Data**: **3.0 points** (allows flexibility for playstyle/rating detection)

**Position Mapping (12 Specific → 8 Formation Positions):**
- LB, CB, RB → **DEF**
- LWB, RWB → **WB**
- LW, RW → **W**
- CDM → **CDM**
- CM → **CM**
- CAM → **CAM**
- ST → **ST**
- GK → **null** (outfield-only formations)

**Example:**
```
Player: Dom
Consensus: RW 75%, CAM 20%
Formation Positions: W (primary: 8.75), CAM (secondary: 5.4)
Final Assignment: W (best match)
```

### Natural Position Detection (Playstyle Fallback)

When position consensus is unavailable, the system automatically detects ideal positions based on playstyles:
- **Hunter** (Pace + Shooting) → ST, W
- **Engine** (Pace + Passing + Dribbling) → CM, W, CAM
- **Sentinel** (Defending + Physical) → DEF, CDM
- **Powerhouse** (Passing + Defending) → CDM, CM
- **Finisher** (Shooting + Physical) → ST
- And 19 other playstyle mappings

### Dynamic Relative Requirements
All position requirements are calculated relative to the available player pool:
- **No hardcoded thresholds** - uses standard deviation and percentiles
- **Adapts to team strength** - requirements scale with player quality
- **Statistical thresholds**:
  - p10: Bottom 10th percentile
  - p25: Bottom quartile
  - p50: Median
  - p75: Top quartile
  - p90: Top 10th percentile

## Formation Selection Algorithm

### Team Composition Analysis
The system analyzes team composition (using position consensus when available, otherwise playstyle attributes) to select appropriate formations:

1. **Player Type Classification**:
   - **Attacking**: High shooting/pace/dribbling attributes OR ST/W/CAM consensus
   - **Defensive**: High defending/physical attributes OR DEF/CDM consensus
   - **Balanced**: Mixed attributes or versatile consensus positions

2. **Formation Templates** (Outfield-Only, Updated Nov 17, 2025):

All formations are **outfield-only** (GK: 0) for the rotating goalkeeper system. Player counts represent outfield positions only.

**Example Formations:**
   - **3-2W-3-1** (9 outfield):
     - Positions: {GK: 0, DEF: 3, WB: 0, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 1}
     - Min/Max: 9-9 players
   - **3-4-1** (8 outfield):
     - Positions: {GK: 0, DEF: 3, WB: 0, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 1}
     - Min/Max: 8-8 players
   - **3-1-3-1** (8 outfield):
     - Positions: {GK: 0, DEF: 3, WB: 0, W: 0, CDM: 1, CM: 2, CAM: 1, ST: 1}
     - Min/Max: 8-8 players
   - **3-1-2-2** (8 outfield):
     - Positions: {GK: 0, DEF: 3, WB: 0, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 2}
     - Min/Max: 8-8 players
   - **2-2-2-2** (8 outfield):
     - Positions: {GK: 0, DEF: 2, WB: 0, W: 0, CDM: 2, CM: 2, CAM: 0, ST: 2}
     - Min/Max: 8-8 players

**Note:** Real match format is 10v10 with 1 non-rotating keeper. When players rotate into goal, all players need tactical outfield positions.

3. **Selection Logic**:
   ```
   If many attacking players → Use 3-1-3-1 or 3-1-2-2
   If many defensive players → Use 3-2W-2-1 with CDM
   If balanced → Use 3-4-1 or 3-2W-2-1

   Position consensus data (when available) takes priority over attribute analysis
   ```

## Position Assignment Algorithm

### Three-Phase Assignment Process (Updated Nov 17, 2025)

The system uses position consensus as the primary detection method, with automatic fallback to playstyle and rating-based detection.

#### Phase 1: Natural Position Fits
- Players assigned to their detected natural positions using **priority-based detection**:
  1. **Position Consensus** (if available): Primary/secondary consensus positions
  2. **Playstyle Detection** (fallback): Attribute-based position mapping
  3. **Rating-based** (final fallback): Attack/Defense/IQ analysis
- Priority given to specialist players (high scores in consensus OR playstyle match)
- Examples:
  - "Dom (RW 75% consensus)" → W position (8.75 score from consensus)
  - "Tom K (Finisher playstyle)" → ST position (no consensus, playstyle fallback)

#### Phase 2: Best Available Fits
- Unassigned players matched to remaining positions
- Scored by **combined analysis**:
  - Consensus match (40% if available) + Attribute compatibility (40%) + Rating fit (20%)
  - OR Attribute compatibility (60%) + Rating fit (40%) if no consensus
- Constraints applied (e.g., minimum defending for CDM, pace requirements)

#### Phase 3: Forced Assignments
- Any remaining players forced into open positions
- Least-bad assignments when no good fits exist
- Still benefits from consensus data if available (helps find "least bad" option)
- Logged as "Forced assignment" in debug

### Swap Optimization

The system performs intelligent position swaps to improve overall team balance:

#### Critical Mismatch Detection
- Identifies players with position scores < 2.0
- Prioritizes fixing terrible mismatches
- Example: Tom K (Finisher) at CM with 0.99 score

#### Swap Rules
1. **Individual Benefit Requirement**: Both players must improve
2. **Position Hierarchy Protection**: Attacking players can't drop >1 level
3. **Critical Mismatch Override**: Hierarchy rules bypassed for critical fixes
4. **Mutual Benefit Analysis**: Total team improvement must exceed threshold

#### Position Hierarchy
```
ST (6) → CAM (5) → CM (4) → CDM (3) → W (2) → DEF (1)
```

## Debug Logging System

### Consolidated Debug Log Structure (Updated Nov 17, 2025)
```
===== CONSOLIDATED FORMATION DEBUG LOG =====
Timestamp: [ISO timestamp]
Total Players: X (Blue: Y, Orange: Z)

=== LEAGUE AVERAGES ===
Ratings: ATK X.XX, DEF X.XX, IQ X.XX
Attributes: PAC X.XX, SHO X.XX, PAS X.XX, DRI X.XX, DEF X.XX, PHY X.XX

=== FORMATION SELECTION ===
BLUE: [Formation]
  Reasoning: [Why this formation was chosen]
  Composition: X ATK, Y DEF, Z BAL
  Playstyle Coverage: X/Y
  Position Consensus Coverage: X/Y (percentage with consensus data)

=== PLAYER ASSIGNMENTS ===
[For each player:]
  ✓/✗ [Name] ([Ratings]) [Attributes]
    Style: [Playstyle] | Score: X.XX | [Assignment reason]
    Position Source: [consensus/playstyle/ratings]

=== OPTIMIZATION NOTES ===
• Position source tracking:
  - "Dom: Using position consensus (RW 75%) → W"
  - "Chris H: No consensus, using playstyle (Engine) → CM/W"
  - "Player: No consensus/playstyle, using ratings → ST"
• Swaps performed with details and improvements
• Critical fixes highlighted
• Consensus match/mismatch analysis
```

### Position Source Tracking (Added Nov 17, 2025)

The debug log now shows WHERE position data came from for each player:

**Position Source Indicators:**
- **👥 Consensus**: Position from peer ratings (most reliable)
- **⚽ Playstyle**: Position from attribute detection (fallback)
- **📊 Ratings**: Position from core ratings only (final fallback)

**Example Debug Output:**
```
• Dom: Using position consensus (RW 75%) → W
  - Consensus score: 8.75/10
  - Assigned to W position (perfect match)

• Chris H: No consensus, using playstyle (Engine) → CM/W
  - Playstyle score: 7.2/10
  - Assigned to CM position (good attribute match)

• New Player: No consensus/playstyle, using ratings → ST
  - Rating-based score: 5.5/10
  - Assigned based on attack rating only
```

### Assignment Reasons
- **Natural position fit (Phase 1)**: Player's ideal position from consensus/playstyle/ratings
- **Best available fit (Phase 2, score: X.XX)**: Good but not perfect fit
- **Forced assignment (Phase 3)**: No good options available
- **CRITICAL FIX**: Swap to fix terrible mismatch
- **Consensus match**: Assigned to position with ≥50% peer consensus
- **Secondary consensus**: Assigned to position with 25-49% consensus

## Implementation Files

### Core Implementation
- **Main Logic**: `/src/utils/teamBalancing/formationSuggester.ts`
- **Types**: `/src/components/admin/team-balancing/types.ts`
- **UI Component**: `/src/components/admin/team-balancing/FormationView.tsx`
- **Debug Views**:
  - `/src/components/admin/team-balancing/FormationDebugView.tsx`
  - `/src/components/admin/team-balancing/ConsolidatedDebugView.tsx`

### Key Functions (Updated Nov 17, 2025)
- `suggestFormations()`: Main entry point
- `selectFormation()`: Chooses formation based on team composition (consensus-aware)
- `assignPlayersToPositions()`: Three-phase assignment algorithm with position consensus priority
- `optimizeAssignments()`: Swap optimization with critical mismatch handling
- `calculateEnhancedPositionScore()`: **Enhanced scoring with position consensus weighting** (40/40/20 or 60/40)
- `getIdealPositionsForPlayer()`: **Priority-based position detection** (consensus → playstyle → ratings)
- `getFormationPositionFromConsensus()`: **Maps specific positions to formation positions** (12 → 8)
- `getFormationPositionsFromPlayer()`: **Gets all applicable formation positions from consensus data**
- `detectPlaystyleFromAttributes()`: Natural position detection (fallback)
- `meetsRelativeRequirements()`: Dynamic threshold checking

## UI Enhancements (Added Nov 17, 2025)

### Position Data Source Badges

Player cards in the Formation View now display visual indicators showing where position data came from:

**Badge System:**
- **👥 Green Badge**: Position from peer consensus (most reliable)
  - Shows when player has ≥5 raters with position data
  - 94% of players currently have this
  - Indicates peer-validated position assignment

- **⚽ Blue Badge**: Position from playstyle attributes (good fallback)
  - Shows when no consensus data available
  - Uses 6 derived attributes for position detection
  - Still reliable for tactical assignment

- **📊 Gray Badge**: Position from core ratings only (basic fallback)
  - Shows when neither consensus nor playstyle data available
  - Uses Attack/Defense/Game IQ ratings
  - Least reliable but functional

### Consensus Position Display

Under each player's name, the card shows:
- **Primary consensus position** with percentage
  - Example: "RW (75%)" indicates strong right winger consensus
- **Consensus vs Assignment comparison**
  - Highlights when assigned position differs from consensus
  - Example: "Consensus: RW" shown under "Assigned: W"

### Enhanced Tooltips

Click on a player card to view expanded information:
- **Alternative Positions**: Other positions player can fill
- **Position Data Source Explanation**:
  - "👥 Peer ratings (position consensus)" - Most reliable
  - "⚽ Playstyle attributes" - Good algorithmic fallback
  - "📊 Core ratings only" - Basic fallback
- **Score Breakdown**: See how consensus/attributes/ratings contributed
- **Number of Raters**: For consensus data (e.g., "Based on 12 raters")

### Visual Workflow

1. **Badge Color**: Quick glance at data quality
2. **Consensus Label**: See expected position
3. **Click to Expand**: Detailed breakdown
4. **Compare Assignment**: Validate if assignment matches expectations

**Example Player Card:**
```
┌────────────────────────┐
│ 👥                  ⭐ │  ← Badges (consensus + specialist)
│                        │
│        Dom             │
│   Consensus: RW        │  ← Primary consensus position
│                        │
│  ATK: 8.5  DEF: 6.0    │
│       IQ: 7.5          │
│    Score: 8.75         │  ← High score (consensus match)
│                        │
│  [Click to expand]     │
└────────────────────────┘
```

## Integration with Team Balancing

1. **After Team Selection**: Teams are formed using tier-based snake draft
2. **Formation Analysis**: Each team's composition analyzed
3. **Position Assignment**: Players assigned to tactical positions
4. **Optimization**: Swaps performed to improve fit
5. **Visual Output**: Formation displayed in pitch view with player cards

## Database Integration

### Playstyle Attributes
- Fetched from `derived_attributes` field in team assignments
- Calculated from `player_derived_attributes` table
- Updated by trigger when playstyle ratings submitted

### Custom Attribute Handling
The system properly handles both:
- **Predefined playstyles**: Named styles like "Hunter", "Engine"
- **Custom attributes**: User-defined attribute combinations
- Database trigger includes both in calculations

## Recent Improvements

### November 17, 2025 - Position Consensus Integration

1. **Position Consensus as Primary Source**: Peer ratings now contribute 40% of position score
   - 94% of players (17/18) have position consensus data
   - Significantly improved position assignment accuracy
   - Score improvements of ~29% on average (3.70→4.77, 3.87→5.39)

2. **Outfield-Only Formations**: All formations converted to GK: 0
   - Supports rotating goalkeeper system
   - All players assigned tactical outfield positions
   - Real format: 10v10 with 1 non-rotating keeper

3. **Position Mapping System**: Seamless 12→8 position translation
   - LB/CB/RB → DEF, LWB/RWB → WB, LW/RW → W, etc.
   - Preserves position consensus accuracy
   - Graceful handling of specific position nuances

4. **Enhanced Scoring Algorithm**: Consensus 40% + Attributes 40% + Ratings 20%
   - Fallback weighting: Attributes 60% + Ratings 40% (no consensus)
   - Primary position match: 7.0-10.0 points (scales with consensus %)
   - Secondary position match: 5.0-7.0 points
   - No consensus: 3.0 points (maintains flexibility)

5. **UI Position Badges**: Visual data source indicators
   - 👥 Green: Peer consensus (most reliable)
   - ⚽ Blue: Playstyle attributes (fallback)
   - 📊 Gray: Core ratings only (basic fallback)
   - Consensus position shown under player name

6. **Graceful Fallbacks**: System handles missing data automatically
   - Priority: Consensus → Playstyle → Ratings
   - Debug logging shows position source for transparency
   - Maintains assignment quality even without consensus

### September 17, 2025 - Playstyle Integration

1. **Relative Requirements**: Replaced hardcoded thresholds with statistical analysis
2. **Critical Mismatch Handling**: Aggressive swap optimization for terrible fits
3. **Database Trigger Fix**: Includes custom attribute ratings
4. **Position Hierarchy Protection**: Prevents inappropriate position demotions
5. **Individual Benefit Enforcement**: Both players must gain from swaps
6. **Enhanced Debug Logging**: Clear reasoning for all decisions

## Configuration

### Position Weights (ENHANCED_POSITION_WEIGHTS)
Customizable weight distribution for each position's attribute requirements.

### Natural Position Mappings (PLAYSTYLE_POSITIONS)
Maps 24 predefined playstyles to their ideal positions.

### Swap Thresholds
- **Critical mismatch**: Score < 2.0
- **Minimum improvement**: 1.5 points total
- **Individual benefit**: 0.5+ points per player
- **Critical fix threshold**: 0.5 points (relaxed)

## Best Practices

1. **Trust the Algorithm**: The system considers multiple factors beyond visible ratings
2. **Review Debug Logs**: Understand why specific assignments were made
3. **Manual Overrides**: Can adjust if domain knowledge suggests better fit
4. **Regular Updates**: Algorithm continuously refined based on feedback
5. **Formation Flexibility**: System adapts to available players, not forcing rigid structures