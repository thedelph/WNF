-- Migration: Remove duplicate XP trigger that causes rank desync
-- Date: 2026-01-08
-- Issue: Two triggers fire on game completion causing XP/rank mismatch
--
-- ROOT CAUSE:
-- There were TWO triggers on the games table for XP updates:
-- 1. trigger_xp_v2_on_game_complete -> recalculate_all_player_xp_v2()
--    - Updates ALL players' XP
--    - Updates ALL ranks
--    - Updates rarity tiers
--
-- 2. update_player_xp_on_game_completion -> update_player_xp()
--    - Updates ONLY game participants' XP
--    - Does NOT update ranks
--
-- When both triggers fire, if update_player_xp() runs after
-- recalculate_all_player_xp_v2(), it updates some XP values
-- without updating ranks, causing ranks to be out of sync with XP order.
--
-- SOLUTION: Remove the redundant trigger. The v2 trigger handles everything.

-- Drop the duplicate trigger that doesn't update ranks
DROP TRIGGER IF EXISTS update_player_xp_on_game_completion ON games;

-- The function can be kept for reference or dropped
-- Keeping it for now in case it's referenced elsewhere
-- DROP FUNCTION IF EXISTS update_player_xp();

-- Note: The following trigger remains and handles all XP/rank/rarity updates:
-- trigger_xp_v2_on_game_complete -> trigger_recalculate_xp_v2_on_game_complete()
