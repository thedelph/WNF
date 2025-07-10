# Rating Average Overwrite Issue

## Date: July 10, 2025

## Issue Description
Player rating averages were being overwritten with individual rating values instead of properly calculated averages. When a player submitted ratings, the rated players' average values in the database would be set to the exact individual rating values rather than the average of all ratings received.

### Example Cases:
**Nathan**
- Daniel's individual ratings: Attack 5, Defense 3, Game IQ 4
- Stored values became: 5/3/4
- Should have been: 6.33/6.0/5.8 (average of all ratings)

**Mike M**
- Daniel's individual ratings: Attack 2, Defense 1, Game IQ 1
- Stored values became: 2/1/1
- Should have been: 4.88/3.38/1.8 (average of all ratings)

## Root Cause (Still Under Investigation)
The database trigger function `update_player_average_ratings()` appears to be correctly written and uses AVG() to calculate averages. However, something was causing the individual rating values to overwrite the calculated averages. Possible causes:
1. A race condition in trigger execution
2. Another process updating the values after the trigger
3. An issue with how Supabase handles upsert operations
4. A bug in PostgreSQL trigger execution

## Immediate Fix Applied

### 1. Created Audit System
- Added `player_rating_audit` table to track all changes to rating columns
- Added `rating_trigger_debug` table to log trigger executions
- Created logging triggers to capture when and how values change

### 2. Enhanced Trigger Function
- Rewrote the trigger with explicit variable declarations
- Added debugging logs to track calculations
- Ensured proper handling of NULL values with FILTER clauses

### 3. Recalculated All Averages
- Created backup table `player_ratings_backup_2025_07_10`
- Ran comprehensive migration to recalculate all averages
- Created verification view `rating_average_verification` to monitor discrepancies

## Code Changes

### Migration: create_player_rating_audit_system
Created audit infrastructure to track all rating changes.

### Migration: enhance_rating_trigger_with_debugging
Enhanced the trigger function with better logging and explicit calculations.

### Migration: fix_all_player_rating_averages_comprehensive
Fixed all current incorrect values and created verification tools.

## Verification
All affected players now have correct average ratings:
- Nathan: 6.33/6.0/5.8 ✓
- Mike M: 4.88/3.38/1.8 ✓
- Alex E: 3.0/7.25/5.6 ✓
- Jack G: 6.0/5.86/5.2 ✓

## Next Steps
1. Monitor the audit logs when new ratings are submitted
2. If the issue recurs, the debug logs will help identify the exact cause
3. Consider implementing a constraint or policy to prevent direct updates to rating columns
4. May need to investigate Supabase-specific behavior with triggers and upserts

## Prevention Measures
- Audit logging is now in place to catch any future occurrences
- Enhanced trigger function should be more robust
- Verification view allows quick checking of data integrity

## Technical Notes
- The issue was reproducible but the exact mechanism is still unclear
- The fix addresses the symptoms while the monitoring will help identify the root cause
- All rating data has been corrected as of this migration