# Game Flow Process

## Overview
This document outlines the complete flow of a game in the WNF system, from creation to completion. Each phase has specific triggers and automated processes that handle the transition between states.

## Phase 1: Game Creation
- Admin creates game using `CreateGameForm`
- Required fields:
  - Date and Time
  - Venue
  - Registration Window (Start/End)
  - Team Announcement Time
  - Max Players (default: 18)
  - Random Slots (default: 2)
  - Pitch Cost

**Initial Status:** `upcoming`

## Phase 2: Registration Open
**Trigger:** Current time reaches `registration_window_start`
- `useRegistrationOpen` hook automatically:
  - Updates game status to `open`
  - Enables player registration
  - Polls every 10 seconds to check status

**Status Change:** `upcoming` → `open`

## Phase 3: Player Selection
**Trigger:** Current time reaches `registration_window_end`
- `useRegistrationClose` hook automatically:
  - Updates game status
  - Triggers player selection process via `process_registration_close()` database function
  - Selection criteria with **payment penalty system**:
    1. **Token-based** (guaranteed slots with forgiveness)
    2. **Merit-based** (XP points with unpaid games penalty - players with unpaid games moved to bottom)
    3. **Random slots** (4-tier priority: WhatsApp+paid → Non-WhatsApp+paid → WhatsApp+unpaid → Non-WhatsApp+unpaid)
- Selected players are marked as `confirmed`
- Remaining players are placed in `reserve` (ordered by WhatsApp status → payment status → XP)

**Status Change:** `open` → `players_announced`

## Phase 4: Reserve Player Management
- If a confirmed player drops out:
  - `create_slot_offers_for_game` function activates
  - Offers slot to reserve players based on:
    1. WhatsApp group membership
    2. XP points
    3. Current streak
    4. Caps
    5. Registration time
  - Only one pending offer allowed at a time
  - 24-hour acceptance window for each offer

## Phase 5: Team Announcement
**Trigger:** Current time reaches `team_announcement_time`
- `useTeamAnnouncement` hook automatically:
  - Divides players into balanced teams using `balanceTeams`
  - Teams are balanced based on:
    - Attack ratings
    - Defense ratings
  - Updates game status

**Status Change:** `players_announced` → `teams_announced`

## Phase 6: Game Day
**Trigger:** Current time reaches game time
- Game is played
- Admin responsibilities:
  1. Confirm actual players who participated
  2. Enter final score
  3. Add payment link for pitch rental contribution

**Status Change:** `teams_announced` → `completed`

## Game Status Flow
```
upcoming → open → players_announced → teams_announced → completed
```

## Important Notes
1. Each phase transition is automated based on timestamps
2. Admins can manually trigger phase transitions if needed
3. Reserve player system ensures maximum participation
4. Team balancing ensures competitive matches
5. Payment tracking helps manage pitch rental costs

## Related Documentation
For detailed information about how components are rendered during each phase of the game, please refer to:
[Component Rendering Documentation](./ComponentRenderingByPhase.md)