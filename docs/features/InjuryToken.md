# Injury Token System

> **Status:** Approved by community vote (12-0)
> **Date:** January 2026
> **Document Purpose:** Comprehensive design specification for implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Design Evolution](#design-evolution)
4. [Final Approved Design](#final-approved-design)
5. [Token System Comparison](#token-system-comparison)
6. [Streak Bonus Mechanics](#streak-bonus-mechanics)
7. [Mathematical Analysis](#mathematical-analysis)
8. [Edge Cases & Scenarios](#edge-cases--scenarios)
9. [Implementation Considerations](#implementation-considerations)
10. [Community Feedback](#community-feedback)
11. [Approved WhatsApp Proposal](#approved-whatsapp-proposal)

---

## Overview

The Injury Token (🩹) is a new token type that provides streak protection for players who sustain injuries during WNF (Wednesday Night Football) games. It complements the existing Priority Token (⭐) and Shield Token (🛡️) systems.

### The Analogy

Think of it like work benefits:
- **Shield Token** = Holiday allowance (planned time off, flexible)
- **Injury Token** = Sick leave (unplanned, take what you need, return when ready)

---

## Problem Statement

### The Gap in Current System

Players who get injured *during* a WNF game face the same penalties as players who simply choose not to attend:

| Scenario | Current Outcome |
|----------|-----------------|
| Skip game for holiday | Streak resets to 0 (or use shield) |
| Injured during WNF game | Streak resets to 0 (or use shield) |

This feels unfair because:
1. The player was injured while participating
2. They shouldn't be punished for playing
3. Shield tokens are earned (10 games each) and limited (max 4)
4. Long injuries (4+ weeks) would consume all shields

### Real Impact of Streak Loss

| Streak Lost | XP Bonus Lost | Recovery Time |
|-------------|---------------|---------------|
| 10 games | 55% bonus | 10 weeks without shields |
| 20 games | 65% bonus | 20 weeks without shields |
| 27 games | 72% bonus | 27 weeks without shields |

Example: A player with a 27-game streak could drop from rank #1 to #16 if their streak resets.

---

## Design Evolution

The injury token design went through several iterations based on community feedback.

### Iteration 1: Fixed 4-Week Protection

**Initial proposal:**
- Admin-approved within 48 hours
- Streak fully frozen for 4 weeks
- No early return (to give other players opportunity)
- Once per year limit

**Feedback:** "Injuries vary in length - hard to put a fixed timeframe"

### Iteration 2: 4-Week Freeze + Decay After

**Refinement:**
- Weeks 1-4: Full streak freeze
- Week 5+: Streak decays -1 per week

**Example:** 20-game streak, out 6 weeks → return with 18-game streak

**Feedback:** "Why the 4-week minimum? Should be like sick leave - return when ready"

### Iteration 3: Remove 4-Week Minimum

**Refinement:**
- Return whenever ready
- Still at bottom of selection list (early return penalty)

**Feedback:** "What if no early return penalty at all?"

### Iteration 4: Remove Early Return Penalty

**Refinement:**
- Return whenever ready, normal priority
- Rely on other safeguards (once per year, decay after 4 weeks)

**Feedback:** "What about no yearly limit too? Like real sick leave"

### Iteration 5: Remove Yearly Limit

**Refinement:**
- No frequency limit
- Trust-based with admin oversight for abuse

**Feedback:** "What about immediate decay instead of 4-week freeze?"

### Iteration 6: Immediate Decay

**Refinement:**
- Streak decays -1 per week from day 1
- No freeze period

**Problem identified:** This makes injury token strictly better than shield token for short absences. Why would anyone use shields?

### Iteration 7: Balancing Against Shields

**Problem:** Need to balance so both tokens have clear use cases.

**Solution:** Instead of decay, return at **half your streak**.

| Token | Mechanism | Best For |
|-------|-----------|----------|
| Shield | Gradual decay (higher XP immediately) | Short planned absences |
| Injury | Return at half (faster rebuild) | Longer unplanned injuries |

### Iteration 8: Verification Concerns

**Options considered:**
1. Admin-only approval → "Too much like dictatorship"
2. Player vote (majority) → "Could be popularity contest"
3. Witness confirmation (2-3 players) → More neutral
4. Trust-based with admin oversight → Simplest

**Final decision:** Fair-use policy. Trust the community, admins intervene only for clear abuse.

### Final Design

- React 🩹 within 48 hours
- Return at half your streak
- Fair-use policy (must be witnessed injury during WNF)
- No frequency limit
- No early return penalty

---

## Final Approved Design

### Activation

| Step | Detail |
|------|--------|
| Trigger | Player injured during WNF game |
| Action | React 🩹 to next game registration message |
| Timeframe | Within 48 hours of injury |
| Verification | Fair-use policy (clear/witnessed injury) |

### Protection Mechanism

| Aspect | Rule |
|--------|------|
| Streak on return | Half of original streak (rounded up) |
| Duration | As long as needed to recover |
| Rebuild | Continue from half point upward |

### Example Scenarios

**20-game streak, out 4 weeks:**
- Original streak: 20
- Return streak: 10
- Week 1 back: 11
- Week 2 back: 12
- Weeks to reach 20 again: 10

**10-game streak, out 2 weeks:**
- Original streak: 10
- Return streak: 5
- Week 1 back: 6
- Week 2 back: 7
- Weeks to reach 10 again: 5

### Restrictions

| Restriction | Rationale |
|-------------|-----------|
| Must be WNF injury | Prevents use for non-game injuries |
| Must be witnessed | Community can verify legitimacy |
| Fair-use policy | Admins can deny obvious abuse |

---

## Token System Comparison

### All Three Tokens

| Aspect | Priority (⭐) | Shield (🛡️) | Injury (🩹) |
|--------|---------------|--------------|-------------|
| Purpose | Guaranteed game slot | Streak protection (planned) | Streak protection (injury) |
| Earned by | Inactivity + eligibility | 10 games played | Injury during WNF |
| Activation | Auto-issued when eligible | Self-serve | React 🩹 |
| Duration | 1 game | Per absence | Per injury |
| Limit | 1 active at a time | Max 4 tokens | Fair-use policy |
| Protection type | Slot guarantee | Gradual decay | Return at half |

### Shield vs Injury: Detailed Comparison

| Factor | Shield (🛡️) | Injury (🩹) |
|--------|-------------|-------------|
| XP on return | Higher immediately | Lower initially |
| Rebuild speed | Slower (converge at half, then climb) | Faster (start at half, climb immediately) |
| Best for | 1-2 week planned absence | 3+ week injuries |
| Eligibility | Any reason | WNF injury only |
| Cost | Uses earned token | Free (incident-based) |

### When to Use Each

| Situation | Best Token | Why |
|-----------|------------|-----|
| 1-week holiday | Shield | Higher XP immediately |
| 2-week work trip | Shield | Still get good XP during rebuild |
| Injured at WNF (3+ weeks) | Injury | Faster rebuild, save shields |
| Injured outside WNF | Shield | Injury token not eligible |
| Want guaranteed slot | Priority | Only token that guarantees selection |

---

## Streak Bonus Mechanics

### Diminishing Returns Structure

The streak bonus uses diminishing returns:

| Streak Game | Bonus Added | Cumulative Bonus |
|-------------|-------------|------------------|
| 1 | +10% | 10% |
| 2 | +9% | 19% |
| 3 | +8% | 27% |
| 4 | +7% | 34% |
| 5 | +6% | 40% |
| 6 | +5% | 45% |
| 7 | +4% | 49% |
| 8 | +3% | 52% |
| 9 | +2% | 54% |
| 10 | +1% | 55% |
| 11+ | +1% each | 56%, 57%, 58%... |

### Key Insight

Games 1-10 provide most of the bonus value (55%). Games 11+ only add 1% each. This means:
- Losing a 10-game streak vs 20-game streak isn't as different as it seems
- Returning at half (10) from a 20-game streak still gives 55% bonus
- The "restart at half" mechanic is generous for high streaks

---

## Mathematical Analysis

### 10-Game Streak Comparison

| Games Back | Shield Effective | Shield Bonus | Injury (half=5) | Injury Bonus |
|------------|------------------|--------------|-----------------|--------------|
| 1 | 9 | 54% | 5 | 40% |
| 2 | 8 | 52% | 6 | 45% |
| 3 | 7 | 49% | 7 | 49% |
| 4 | 6 | 45% | 8 | 52% |
| 5 | 5 | 40% | 9 | 54% |
| 6 | 6 | 45% | 10 | 55% |
| 7 | 7 | 49% | 11 | 56% |

**Crossover point:** Game 3 (both at 49%)

**Total XP bonus over 7 games:**
- Shield: 54+52+49+45+40+45+49 = 334%
- Injury: 40+45+49+52+54+55+56 = 351%

### 20-Game Streak Comparison

| Games Back | Shield Effective | Shield Bonus | Injury (half=10) | Injury Bonus |
|------------|------------------|--------------|------------------|--------------|
| 1 | 19 | 64% | 10 | 55% |
| 2 | 18 | 63% | 11 | 56% |
| 3 | 17 | 62% | 12 | 57% |
| 4 | 16 | 61% | 13 | 58% |
| 5 | 15 | 60% | 14 | 59% |
| 6 | 14 | 59% | 15 | 60% |
| 7 | 13 | 58% | 16 | 61% |
| 8 | 12 | 57% | 17 | 62% |
| 9 | 11 | 56% | 18 | 63% |
| 10 | 10 | 55% | 19 | 64% |

**Crossover point:** Game 5-6 (around 59-60%)

### Analysis Summary

| Streak Length | Shield Advantage | Injury Advantage | Crossover |
|---------------|------------------|------------------|-----------|
| 10 games | Games 1-2 | Games 4+ | Game 3 |
| 20 games | Games 1-5 | Games 7+ | Game 5-6 |

**Conclusion:** Shield is better for short absences (higher immediate XP), Injury is better for longer absences (faster rebuild to peak).

---

## Edge Cases & Scenarios

### What if player wasn't injured at WNF?

Not eligible for injury token. Must use shield tokens for:
- Injuries that occurred elsewhere
- Planned absences (holiday, work)
- Personal reasons

### What if injury is disputed?

Fair-use policy applies:
- Was the player at that game? (Verifiable)
- Did others witness the injury? (Social proof)
- Is this player known for gaming systems? (Reputation)
- Admin makes judgment call if needed

### What if player claims injury frequently?

Admins can deny requests if pattern of abuse is detected. The fair-use policy allows for discretion.

### What if player has a 2-game streak?

Still eligible:
- 2-game streak → return at 1 (half rounded up)
- Still better than resetting to 0 and losing momentum

### Very long injury (12+ weeks)?

Injury token still applies:
- 20-game streak → return at 10
- Doesn't matter if out 4 weeks or 12 weeks
- Return at half whenever ready

### Can injury token and shield be combined?

No need - injury token provides its own protection. Player should choose one:
- Short absence → Shield (better immediate XP)
- WNF injury → Injury token (faster rebuild)

---

## Implementation Considerations

### Database Schema

**New table: `injury_token_usage`**

```sql
CREATE TABLE injury_token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) NOT NULL,
    game_id UUID REFERENCES games(id) NOT NULL,  -- Game where injury occurred
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    original_streak INTEGER NOT NULL,
    return_streak INTEGER NOT NULL,  -- Half of original
    returned_at TIMESTAMP WITH TIME ZONE,  -- When player returned
    return_game_id UUID REFERENCES games(id),  -- Game they returned in
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'returned', 'denied'
    denied_reason TEXT,  -- If admin denied
    denied_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(player_id, game_id)  -- One injury claim per game
);
```

**New columns on `players` table:**

```sql
ALTER TABLE players ADD COLUMN injury_token_active BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN injury_original_streak INTEGER;
ALTER TABLE players ADD COLUMN injury_return_streak INTEGER;
```

### Key Functions Needed

1. **`activate_injury_token(player_id, game_id)`**
   - Validate player was selected in that game
   - Calculate return streak (half of current streak)
   - Store original and return streak values
   - Mark injury token as active

2. **`process_injury_return(player_id, game_id)`**
   - Set player's streak to return_streak value
   - Mark injury token as returned
   - Clear injury token active flag
   - Log the return

3. **`deny_injury_token(player_id, game_id, reason, admin_id)`**
   - Mark injury token as denied
   - Log the denial with reason
   - Admin audit trail

4. **`get_injury_token_status(player_id)`**
   - Return current injury token status
   - Include original streak, return streak, activation date

### UI Components Needed

1. **Injury Token Status Display**
   - Show on player profile when active
   - Display original streak and return streak
   - Show "On Injury Reserve" badge

2. **Activation UI**
   - React 🩹 to game registration (or button)
   - Confirmation modal showing:
     - Current streak
     - Return streak (half)
     - Explanation of how it works

3. **Admin Management**
   - View all active injury tokens
   - Ability to deny with reason
   - Audit log of all injury token activity

4. **Return Flow**
   - When player registers for a game while on injury reserve
   - Confirm they're returning
   - Apply return streak value

### Integration Points

1. **Game Registration**
   - Check if player has active injury token
   - If returning, process the return
   - Apply return streak before calculating XP

2. **Streak Calculation**
   - When player returns, use return_streak as starting point
   - Continue building from there

3. **Player Profile**
   - Show injury reserve status
   - Show expected return streak

4. **Game History/Admin**
   - Show injury token activations
   - Allow admin denial

---

## Community Feedback

### Key Feedback Points

| Feedback | From | Resolution |
|----------|------|------------|
| "Injuries vary in length" | David | Removed fixed 4-week duration |
| "Guaranteed games on return?" | David | Not needed - half streak is protection enough |
| "Streak decay weekly?" | David | Changed to "return at half" for better balance |
| "Admin approval is dictatorship" | David | Changed to fair-use policy |
| "Player vote is popularity contest" | Chris | Changed to fair-use policy |
| "Why use shields if injury is better?" | Chris | Balanced with "return at half" mechanic |
| "Like work sick leave" | Group | Final analogy adopted |

### Design Principles Agreed

1. **Trust the community** - Fair-use policy, not bureaucratic approval
2. **Simple rules** - One sentence explanation possible
3. **Clear differentiation** - Shield vs Injury have distinct use cases
4. **Player-friendly** - Return when ready, no forced duration

---

## Approved WhatsApp Proposal

The following message was posted to the WNF WhatsApp group and received **12 votes for, 0 against**:

```
🩹 Proposal: Injury Token

Injured during WNF game? React 🩹 to next game registration.

* Take as long as you like off to recover. Return at half your streak
  bonus, instead of it being reset to 0, then rebuild from there
* Example: 20-game streak bonus → return at 10 → build to 11, 12, 13...
* Fair-use policy to begin with, as long as it was a clear/witnessed
  injury during WNF game, might change later down the line

🛡️Shield vs 🩹Injury:
* 🛡️Shield = higher XP immediately, slower rebuild (use for holidays)
* 🩹Injury = lower XP initially, faster rebuild (use for WNF injuries)

Worth adding? Poll below.
```

**Result:** Unanimously approved (12-0)

---

## Next Steps

1. [ ] Create database migration for injury token tables
2. [ ] Implement activation function
3. [ ] Implement return processing function
4. [ ] Add UI for injury token status on player profile
5. [ ] Add activation flow (react 🩹 or button)
6. [ ] Add admin management interface
7. [ ] Update streak calculation to handle injury returns
8. [ ] Add audit logging
9. [ ] Test edge cases
10. [ ] Deploy and announce to community

---

## Appendix: Rejected Alternatives

### Why Not Full Streak Freeze?

Full freeze (keep exact streak) was considered but rejected because:
- Makes injury token strictly better than shields
- No trade-off or decision-making required
- Too generous for a "free" (non-earned) token

### Why Not Decay Per Week?

Decay of -1 per week was considered but rejected because:
- Also makes injury token better than shields for short absences
- Shield would become obsolete
- "Return at half" creates clearer differentiation

### Why Not Admin-Only Approval?

Rejected as "too much like dictatorship" - one person shouldn't have sole power over injury claims.

### Why Not Player Vote?

Rejected as potential "popularity contest" - unpopular players might not get approved even with genuine injuries.

### Why Not Witness Confirmation?

Considered (2-3 witnesses), but fair-use policy is simpler. If injuries are witnessed at games, abuse will be socially apparent anyway.

---

*Document created: January 2026*
*Last updated: January 2026*
*Status: Ready for implementation*
