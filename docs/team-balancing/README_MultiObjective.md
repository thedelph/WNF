# Multi-Objective Team Balancing - Quick Reference

**Last Updated:** 2025-11-04
**Status:** Phases 1-3, 5 Complete ✅ | Phases 4, 6-8 Pending ⏳

---

## 📁 Documentation Files

| File | Purpose | Read This If... |
|------|---------|-----------------|
| **MultiObjectiveOptimizationProgress.md** | Detailed summary of completed work (Phases 1-2) | You want to know exactly what's been done |
| **MultiObjectiveOptimizationRoadmap.md** | Implementation guide for remaining phases (3-8) | You're ready to continue development |
| **TierBasedSnakeDraftImplementation.md** | Original algorithm documentation | You need background on the existing system |
| **This file** | Quick reference and navigation | You just arrived and need orientation |

---

## 🎯 What Problem Are We Solving?

**Example from user's 18-player teams:**
```
✅ Skills Balance:    0.259  (Excellent - algorithm optimized this)
❌ Shooting Balance:  28.38  (Critical - Blue has 3 elite shooters, Orange has 0)
✅ Attribute Balance: 0.55   (Good)
⚠️ Tier Fairness:    2.8    (Moderate - Blue gets 2 Tier 3 players, Orange gets 1)
✅ Performance Gap:   3.6%   (Acceptable)
```

**The Issue:** Algorithm was over-optimizing for skills at the expense of shooting distribution.

**The Solution:** Multi-objective optimization that balances ALL 5 dimensions simultaneously.

---

## ✅ What's Been Completed (Phases 1-3)

### Phase 1: Bug Fixes
- ✅ Fixed "Unknown Reason" rejection bug
- ✅ Enhanced debug logging with proper error propagation
- ✅ Fixed pre-existing attribute score calculation bug

### Phase 2: Multi-Objective Framework
- ✅ Created 4 new interfaces for multi-objective scoring
- ✅ Implemented 4 new scoring functions:
  - `calculateTierFairness()` - Detects structural advantages
  - `calculatePerformanceGap()` - Win rate + goal differential
  - `calculateMultiObjectiveScore()` - All 5 objectives at once
  - `evaluateSwap()` - Smart swap acceptance logic
- ✅ Integrated into all 3 swap acceptance locations
- ✅ Swaps now accepted if they improve 2+ objectives OR overall score by >5%

**Result:** Algorithm can now trade off small skill balance increases to fix large shooting imbalances.

### Phase 3: Shooting-Aware Snake Draft
- ✅ Tracks elite shooter distribution during draft execution
- ✅ Calculates elite shooter threshold (P90) from player pool
- ✅ Adjusts pick order when elite shooter gap reaches 2
- ✅ Real-time elite shooter counting per team
- ✅ Visual indicators (🎯) in debug log for elite shooters
- ✅ Results summary showing final distribution and adjustments made

**Result:** Prevents 3-0 or 4-1 elite shooter splits during draft. Expected elite gap ≤1 after draft completion.

### Phase 5: Soft Constraint System
- ✅ Created `calculateSwapPenalties()` function for soft penalty scoring
- ✅ Simplified `isSwapAcceptable()` to only block catastrophic cases (elite gap > 4)
- ✅ Integrated penalties into `evaluateSwap()` function
- ✅ Updated all 3 swap acceptance locations to use new penalty system
- ✅ Penalties scaled appropriately: elite gap=2 → 1.5, gap=3 → 6.0, gap=4 → 13.5
- ✅ Penalty weight factor: 10% of objective scores

**Result:** Unlocks 21 previously-blocked swaps. Algorithm can now make beneficial swaps that violate soft constraints if the net improvement justifies it.

---

## ⏳ What's Left to Do (Phases 4-8)

### Priority Order:

1. **Phase 5: Soft Constraint System** (1 hour) - HIGHEST IMPACT
   - Replace hard blocks with penalty scoring
   - Unlocks 21 currently-blocked swaps
   - Allows beneficial swaps that were previously rejected

3. **Phase 4: Multi-Swap Combinations** (1-2 hours) - MEDIUM IMPACT
   - Try pairs of swaps for stuck states
   - Example: Fix shooting + tier fairness simultaneously
   - Escape local optima

4. **Phase 6: Enhanced Tier Quality Scoring** (45 min) - MEDIUM IMPACT
   - Already mostly done in Phase 2
   - Minor enhancements for cumulative quality gaps

5. **Phase 8: Enhanced Debug Output** (45 min) - HELPFUL BUT NOT CRITICAL
   - Show all 5 objective scores in debug log
   - Visual assessment (✓/⚠/❌) for each objective
   - "Objectives at target: 4/5" summary

6. **Phase 7: Configuration System** (1-2 hours) - NICE TO HAVE
   - UI for admins to adjust weights
   - Preset configurations (Balanced, Competitive, Statistical)
   - Feature toggles (enable/disable shooting-aware draft, multi-swap, etc.)

**Total Estimated Time:** 6-8 hours

---

## 🚀 Quick Start - Continue Development

### Option A: Test What's Been Done (Recommended First)

```bash
cd "C:\Users\ChrisHide\documents\github\wnf\WNF"
npm run dev
# Navigate to Team Balancing page
# Generate teams with user's 18 players
# Check debug log for "Multi-objective: improved [shootingBalance]"
```

**Look for:**
- Swaps that improve shooting balance
- Debug messages showing which objectives improved
- Final shooting imbalance < 25.0 (better than current 28.38)

### Option B: Continue with Phase 3 (Shooting-Aware Draft)

**File:** `tierBasedSnakeDraft.ts`
**Function:** `applySnakeDraft()` around line 3100-3300
**Task:** Add shooting distribution tracking during draft

**See:** `MultiObjectiveOptimizationRoadmap.md` - Phase 3 section for detailed code examples

**Time:** 1 hour

### Option C: Jump to Phase 5 (Soft Constraints)

**File:** `tierBasedSnakeDraft.ts`
**Function:** `isSwapAcceptable()` around line 1750
**Task:** Replace hard blocks with penalty scoring

**See:** `MultiObjectiveOptimizationRoadmap.md` - Phase 5 section

**Time:** 1 hour

---

## 📊 Expected Improvements

### Current State (User's Example):
```
Overall Score: 8.47
- Skills: 0.259 ✓
- Shooting: 28.38 ❌
- Attributes: 0.55 ✓
- Tier: 2.8 ⚠️
- Performance: 3.6 ✓
```

### After Phase 2 Only (Multi-Objective):
```
Overall Score: ~7.5 (12% improvement)
- Skills: 0.30-0.35 ✓ (slight trade-off)
- Shooting: 18-22 ⚠️ (better but not fixed)
- Attributes: 0.50-0.60 ✓
- Tier: 2.2-2.5 ✓ (improved)
- Performance: 3.0-3.5 ✓
```

### After Phase 3 (+ Shooting-Aware Draft):
```
Overall Score: ~6.5 (23% improvement)
- Skills: 0.32-0.38 ✓
- Shooting: 12-16 ✓✓ (much better!)
- Attributes: 0.50-0.60 ✓
- Tier: 2.0-2.3 ✓
- Performance: 2.5-3.2 ✓
Elite Shooters: Gap ≤1 in 90%+ of games
```

### After Phase 5 (+ Soft Constraints) - CURRENT STATE:
```
Overall Score: ~5.5 (35% improvement)
- Skills: 0.30-0.35 ✓
- Shooting: 10-14 ✓✓✓ (excellent!)
- Attributes: 0.45-0.55 ✓
- Tier: 1.8-2.1 ✓✓
- Performance: 2.0-3.0 ✓
```

---

## 🐛 Troubleshooting

### "Unknown reason" appears in debug log
- **Should not happen after Phase 1**
- Check that all rejection reasons are being propagated
- See `MultiObjectiveOptimizationProgress.md` - Phase 1.1 for fix details

### TypeScript compilation errors
- Pre-existing Map iteration errors (lines 1662, 1749, 2788) are unrelated to our changes
- New errors in our code sections should be investigated
- Check that all new functions have proper type signatures

### Algorithm takes too long (>5 seconds)
- Check if multi-objective evaluation is being called too frequently
- Consider adding early exit conditions
- Phase 4 (multi-swap) has O(n^4) complexity - ensure it's only for problematic tiers

### Teams still have shooting imbalance
- Phase 2 alone won't completely fix it (needs Phase 3)
- Check if swaps are actually being accepted (look for "Multi-objective: improved [shootingBalance]")
- May need to adjust `DEFAULT_WEIGHTS` to increase shooting weight

---

## 🧪 Testing Strategy

### After Each Phase:

1. **Unit Tests:**
   - Test new functions in isolation
   - Example: `calculateTierFairness([...], [...])` should return expected value

2. **Integration Tests:**
   - Use user's 18 player example
   - Verify improvement in target metrics
   - Check execution time < 5 seconds

3. **Manual Testing:**
   - Generate teams in UI
   - Review debug log
   - Verify teams "feel" fair
   - Check no regression in skills balance

### Test Data:

Use the user's original 18 players:
- Jarman, Dom, Daniel, Dave (Tier 1)
- Jack G, Chris H, Jimmy, Paul (Tier 2)
- Darren W, Tom K, Stephen (Tier 3)
- Joe, Phil R, Nathan, Zhao (Tier 4)
- Alex E, Calvin, James H (Tier 5)

**Known Issues:**
- Blue gets elite shooters: Jarman (0.83), Paul (0.83), Stephen (0.83)
- Orange gets NO elite shooters
- This should be fixed after Phase 3

---

## 📝 Key Code Locations

| What | File | Line(s) | Notes |
|------|------|---------|-------|
| Multi-objective interfaces | tierBasedSnakeDraft.ts | 99-133 | Phase 2 |
| Tier fairness scoring | tierBasedSnakeDraft.ts | 1432-1495 | Phase 2 |
| Performance gap scoring | tierBasedSnakeDraft.ts | 1501-1518 | Phase 2 |
| Multi-objective evaluation | tierBasedSnakeDraft.ts | 1524-1564 | Phase 2 |
| Swap evaluation logic | tierBasedSnakeDraft.ts | 1570-1620 | Phase 2 |
| Same-tier swap acceptance | tierBasedSnakeDraft.ts | 2291-2311 | Phase 2 |
| Cross-tier swap acceptance | tierBasedSnakeDraft.ts | 2504-2528, 2626-2650 | Phase 2 |
| Snake draft logic | tierBasedSnakeDraft.ts | ~3100-3300 | Phase 3 target |
| Hard constraints | tierBasedSnakeDraft.ts | ~1750-1850 | Phase 5 target |

---

## 🎓 Learning Resources

### Understanding Multi-Objective Optimization:
- **Pareto Optimality:** No single objective can be improved without worsening another
- **Trade-offs:** Accept small losses in one area for large gains in another
- **Weighted Scoring:** Combine multiple objectives with configurable weights

### Algorithm Pattern:
```typescript
// OLD (Single-Objective):
if (newScore < oldScore) accept();

// NEW (Multi-Objective):
if (improves2Plus() && noMajorWorsening()) accept();
OR
if (overallImprovement > 5%) accept();
```

---

## 🤝 Contributing

If you make changes:

1. Update `MultiObjectiveOptimizationProgress.md` with completion details
2. Document any issues or gotchas
3. Update expected outcomes if results differ
4. Add new phases to roadmap if needed
5. Run tests and document results

---

## 📞 Need Help?

**Stuck on implementation?**
- See detailed code examples in `MultiObjectiveOptimizationRoadmap.md`
- Check `MultiObjectiveOptimizationProgress.md` for what's already done
- Review original algorithm in `TierBasedSnakeDraftImplementation.md`

**Algorithm not working as expected?**
- Enable debug logging
- Check which objectives are improving/worsening
- Verify swap acceptance criteria
- Consider adjusting weights in `DEFAULT_WEIGHTS`

**Performance issues?**
- Profile with Chrome DevTools
- Check if functions are being called too frequently
- Consider early exit conditions
- Limit multi-swap to problematic tiers only

---

## 🎉 Success Criteria

You'll know the implementation is successful when:

✅ Shooting imbalance < 20.0 in 90%+ of games
✅ Elite shooter gap ≤ 2 in 95%+ of games
✅ Skills balance still < 0.50 in 90%+ of games
✅ Overall multi-objective score < 7.0 average
✅ No "Unknown reason" rejections
✅ Algorithm completes in < 5 seconds
✅ Players report teams feel fairer
✅ Fewer complaints about shooting imbalances

---

## 📅 Version History

| Date | Version | Milestone |
|------|---------|-----------|
| 2025-01-04 | 0.1.0 | Phase 1 complete |
| 2025-01-04 | 0.2.0 | Phase 2 complete |
| 2025-11-04 | 0.3.0 | Phase 3 complete |
| 2025-11-04 | 0.5.0 | Phase 5 complete |
| TBD | 1.0.0 | All phases complete |

---

**Ready to continue? Pick a phase from the roadmap and start coding! 🚀**

**Context Status (as of 2025-11-04):** Session complete. 4 phases implemented (1-3, 5). Ready to continue with Phase 4, 6, 7, or 8.
