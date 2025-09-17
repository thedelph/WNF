# Formation Suggester System

## Overview
An intelligent formation suggestion system that analyzes team composition and assigns players to optimal positions based on their playstyle attributes. The system uses 6 derived attributes (Pace, Shooting, Passing, Dribbling, Defending, Physical) from the playstyle rating system to determine the best tactical formation and position assignments for each team.

## Core Concepts

### 6-Attribute Position Scoring
Each position has weighted requirements for the 6 attributes:
- **ST (Striker)**: Shooting 35%, Pace 25%, Dribbling 20%, Physical 10%
- **CAM (Attacking Mid)**: Passing 35%, Dribbling 25%, Shooting 20%
- **CM (Central Mid)**: Passing 35%, Physical 20%, Defending 15%
- **CDM (Defensive Mid)**: Defending 30%, Physical 25%, Passing 20%
- **W (Winger)**: Pace 35%, Dribbling 30%, Crossing/Passing 15%
- **DEF (Defender)**: Defending 40%, Physical 30%, Pace 10%

### Natural Position Detection
The system automatically detects ideal positions based on playstyles:
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
The system analyzes team composition to select appropriate formations:

1. **Player Type Classification**:
   - **Attacking**: High shooting, pace, or dribbling
   - **Defensive**: High defending or physical
   - **Balanced**: Mixed attributes

2. **Formation Templates**:
   - **3-2W-2-1**: Balanced formation with wingers
   - **3-4-1**: Midfield-heavy formation
   - **3-1-3-1**: Attack-focused with single CDM
   - **3-1-2-2**: Twin striker formation
   - **2-2-2-2**: Ultra-balanced 8-player formation

3. **Selection Logic**:
   ```
   If many attacking players → Use 3-1-3-1 or 3-1-2-2
   If many defensive players → Use 3-2W-2-1 with CDM
   If balanced → Use 3-4-1 or 3-2W-2-1
   ```

## Position Assignment Algorithm

### Three-Phase Assignment Process

#### Phase 1: Natural Position Fits
- Players assigned to their detected natural positions
- Priority given to specialist players
- Example: "Finisher" → ST, "Sentinel" → DEF

#### Phase 2: Best Available Fits
- Unassigned players matched to remaining positions
- Scored by attribute compatibility
- Constraints applied (e.g., minimum defending for CDM)

#### Phase 3: Forced Assignments
- Any remaining players forced into open positions
- Least-bad assignments when no good fits exist
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

### Consolidated Debug Log Structure
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

=== PLAYER ASSIGNMENTS ===
[For each player:]
  ✓/✗ [Name] ([Ratings]) [Attributes]
    Style: [Playstyle] | Score: X.XX | [Assignment reason]

=== OPTIMIZATION NOTES ===
• Swaps performed with details and improvements
• Critical fixes highlighted
```

### Assignment Reasons
- **Natural position fit (Phase 1)**: Player's ideal position
- **Best available fit (Phase 2, score: X.XX)**: Good but not perfect fit
- **Forced assignment (Phase 3)**: No good options available
- **CRITICAL FIX**: Swap to fix terrible mismatch

## Implementation Files

### Core Implementation
- **Main Logic**: `/src/utils/teamBalancing/formationSuggester.ts`
- **Types**: `/src/components/admin/team-balancing/types.ts`
- **UI Component**: `/src/components/admin/team-balancing/FormationView.tsx`
- **Debug Views**:
  - `/src/components/admin/team-balancing/FormationDebugView.tsx`
  - `/src/components/admin/team-balancing/ConsolidatedDebugView.tsx`

### Key Functions
- `suggestFormations()`: Main entry point
- `selectFormation()`: Chooses formation based on team composition
- `assignPlayersToPositions()`: Three-phase assignment algorithm
- `optimizeAssignments()`: Swap optimization with critical mismatch handling
- `calculateEnhancedPositionScore()`: Attribute-based scoring
- `detectPlaystyleFromAttributes()`: Natural position detection
- `meetsRelativeRequirements()`: Dynamic threshold checking

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

## Recent Improvements (2025-09-17)

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