# Reserve XP Display Fix

## Overview
This document details a fix for an issue where the XPBreakdown component wasn't properly displaying reserve XP in player profiles.

## Issue
Players with reserve activity were showing the correct total XP in their profile, but the XP breakdown didn't display the reserve XP component. For example, a player might show 206 XP total, but their XP breakdown would only account for 200 XP, missing the 5 XP from being a reserve (which with a 10% streak bonus would round to 6 XP).

## Root Cause
The issue was due to a property name mismatch in the PlayerProfile.tsx file. When passing data to the XPBreakdown component, the reserve XP was being passed as `reserveXp` (lowercase 'p'), but the component expected the property to be named `reserveXP` (uppercase 'P').

### Examples from Database
For a player like "Anthony B":
- Base XP: 182
- Reserve XP: 5 (for being a reserve 1 time)
- Reserve Games: 1
- Attendance Streak: 1 (10% bonus)
- Total XP: 206

The calculation is:
- Base XP (182) + Reserve XP (5) = 187
- 187 × 1.1 (10% streak bonus) = 205.7, which rounds to 206

## Fix
The fix involved updating the property name in the PlayerProfile.tsx file to match what the XPBreakdown component expects:

```typescript
// Before
reserveXp: player.reserve_xp ?? 0,

// After
reserveXP: player.reserve_xp ?? 0, // Changed to match component prop name
```

## Documentation Updates
The XPBreakdown.md documentation has been updated to include a note about the correct property naming for `reserveXP` with an uppercase 'P' to prevent future issues with property name mismatches.

## Related Components
- XPBreakdown.tsx - Main component for displaying XP breakdown
- ReserveXPSection.tsx - Sub-component for displaying reserve XP
- PlayerProfile.tsx - Page component where the fix was applied

## Verification
The fix was verified by examining the database values for players with reserve activity and confirming that:
1. The total XP calculation was correct (including reserve XP + streak bonus)
2. The reserve XP is now properly displayed in the XP breakdown

## Lessons Learned
- Property names in TypeScript are case-sensitive, and inconsistencies can lead to subtle bugs
- Documentation should explicitly note case requirements for component props
- When investigating display issues, compare data from the database with what's being displayed to identify discrepancies
