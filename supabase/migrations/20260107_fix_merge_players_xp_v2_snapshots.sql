-- Fix merge_players function to include xp_v2 in snapshot handling
-- This prevents XP display issues after merging players

DROP FUNCTION IF EXISTS merge_players(uuid, uuid);

CREATE OR REPLACE FUNCTION public.merge_players(source_player_id uuid, target_player_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    source_xp INTEGER;
    target_xp INTEGER;
    v_token RECORD;
    v_snapshot RECORD;
    v_game_reg RECORD;
    v_rating RECORD;
BEGIN
    -- First, handle player_ratings_history (must be done before player_ratings)
    UPDATE player_ratings_history
    SET rater_id = target_player_id
    WHERE rater_id = source_player_id;

    UPDATE player_ratings_history
    SET rated_player_id = target_player_id
    WHERE rated_player_id = source_player_id;

    -- Handle player_rating_audit
    UPDATE player_rating_audit
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    -- Handle payment_presets
    UPDATE payment_presets
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    -- Handle player_status_changes
    UPDATE player_status_changes
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    -- Handle slot_offers (multiple columns)
    UPDATE slot_offers
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    UPDATE slot_offers
    SET dropped_out_player_id = target_player_id
    WHERE dropped_out_player_id = source_player_id;

    UPDATE slot_offers
    SET admin_id = target_player_id
    WHERE admin_id = source_player_id;

    -- Handle admin_roles
    UPDATE admin_roles
    SET player_id = target_player_id
    WHERE player_id = source_player_id
    AND NOT EXISTS (
        SELECT 1 FROM admin_roles
        WHERE player_id = target_player_id
    );

    -- Delete duplicate admin roles
    DELETE FROM admin_roles
    WHERE player_id = source_player_id;

    -- Handle token_history references
    UPDATE token_history
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    UPDATE token_history
    SET performed_by = target_player_id
    WHERE performed_by = source_player_id;

    -- Handle token history foreign key constraint before modifying tokens
    FOR v_token IN (
        SELECT pt.id
        FROM player_tokens pt
        WHERE pt.player_id = source_player_id
        AND EXISTS (
            SELECT 1 FROM token_history th WHERE th.token_id = pt.id
        )
    ) LOOP
        UPDATE token_history
        SET token_id = (
            SELECT id
            FROM player_tokens
            WHERE player_id = target_player_id
            ORDER BY issued_at DESC
            LIMIT 1
        )
        WHERE token_id = v_token.id;
    END LOOP;

    -- Handle tokens
    FOR v_token IN (
        SELECT id, used_at, expires_at
        FROM player_tokens
        WHERE player_id = source_player_id
    ) LOOP
        IF v_token.used_at IS NULL AND (v_token.expires_at IS NULL OR v_token.expires_at > NOW()) THEN
            IF NOT EXISTS (
                SELECT 1
                FROM player_tokens
                WHERE player_id = target_player_id
                AND used_at IS NULL
                AND (expires_at IS NULL OR expires_at > NOW())
            ) THEN
                UPDATE player_tokens
                SET player_id = target_player_id
                WHERE id = v_token.id;
            ELSE
                UPDATE player_tokens
                SET used_at = NOW(),
                    used_game_id = NULL
                WHERE id = v_token.id;
            END IF;
        END IF;
    END LOOP;

    DELETE FROM player_tokens
    WHERE player_id = source_player_id;

    -- Handle reserve_xp_transactions
    UPDATE reserve_xp_transactions
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    -- Handle XP snapshots (FIXED: now includes xp_v2)
    FOR v_snapshot IN (
        SELECT snapshot_date, xp, xp_v2, created_at, rank, rarity
        FROM player_xp_snapshots
        WHERE player_id = source_player_id
    ) LOOP
        IF EXISTS (
            SELECT 1
            FROM player_xp_snapshots
            WHERE player_id = target_player_id
            AND snapshot_date = v_snapshot.snapshot_date
        ) THEN
            -- Update existing snapshot if source has higher XP
            UPDATE player_xp_snapshots
            SET xp = v_snapshot.xp,
                xp_v2 = COALESCE(v_snapshot.xp_v2, xp_v2),
                created_at = GREATEST(created_at, v_snapshot.created_at),
                rank = v_snapshot.rank,
                rarity = v_snapshot.rarity
            WHERE player_id = target_player_id
            AND snapshot_date = v_snapshot.snapshot_date
            AND xp < v_snapshot.xp;
        ELSE
            -- Insert new snapshot with xp_v2
            INSERT INTO player_xp_snapshots (player_id, snapshot_date, xp, xp_v2, created_at, rank, rarity)
            VALUES (target_player_id, v_snapshot.snapshot_date, v_snapshot.xp, v_snapshot.xp_v2, v_snapshot.created_at, v_snapshot.rank, v_snapshot.rarity);
        END IF;
    END LOOP;

    DELETE FROM player_xp_snapshots
    WHERE player_id = source_player_id;

    -- Handle player XP
    SELECT xp INTO source_xp
    FROM player_xp
    WHERE player_id = source_player_id;

    SELECT xp INTO target_xp
    FROM player_xp
    WHERE player_id = target_player_id;

    UPDATE player_xp
    SET xp = COALESCE(target_xp, 0) + COALESCE(source_xp, 0),
        last_calculated = NOW()
    WHERE player_id = target_player_id;

    IF NOT FOUND AND source_xp IS NOT NULL THEN
        INSERT INTO player_xp (player_id, xp, last_calculated)
        VALUES (target_player_id, source_xp, NOW());
    END IF;

    DELETE FROM player_xp
    WHERE player_id = source_player_id;

    -- Handle game registrations with conflict resolution
    FOR v_game_reg IN (
        SELECT game_id, status, paid, team,
               paid_by_player_id, payment_recipient_id
        FROM game_registrations
        WHERE player_id = source_player_id
    ) LOOP
        -- Check if target is already registered for this game
        IF EXISTS (
            SELECT 1
            FROM game_registrations
            WHERE player_id = target_player_id
            AND game_id = v_game_reg.game_id
        ) THEN
            -- If source registration is paid but target's isn't, update payment info
            IF v_game_reg.paid = true THEN
                UPDATE game_registrations
                SET paid = true,
                    paid_by_player_id = COALESCE(v_game_reg.paid_by_player_id, paid_by_player_id),
                    payment_recipient_id = COALESCE(v_game_reg.payment_recipient_id, payment_recipient_id)
                WHERE player_id = target_player_id
                AND game_id = v_game_reg.game_id
                AND paid = false;
            END IF;
            -- Delete the source registration since target already has one
            DELETE FROM game_registrations
            WHERE player_id = source_player_id
            AND game_id = v_game_reg.game_id;
        ELSE
            -- No conflict, update the registration to target player
            UPDATE game_registrations
            SET player_id = target_player_id
            WHERE player_id = source_player_id
            AND game_id = v_game_reg.game_id;
        END IF;
    END LOOP;

    -- Update payment references in game_registrations
    UPDATE game_registrations
    SET paid_by_player_id = target_player_id
    WHERE paid_by_player_id = source_player_id;

    UPDATE game_registrations
    SET payment_recipient_id = target_player_id
    WHERE payment_recipient_id = source_player_id;

    UPDATE game_registrations
    SET payment_verified_by = target_player_id
    WHERE payment_verified_by = source_player_id;

    -- Handle player ratings with conflict resolution
    FOR v_rating IN (
        SELECT id, rated_player_id, attack_rating, defense_rating,
               game_iq_rating, created_at, updated_at
        FROM player_ratings
        WHERE rater_id = source_player_id
    ) LOOP
        -- Check if target already rated this player
        IF EXISTS (
            SELECT 1
            FROM player_ratings
            WHERE rater_id = target_player_id
            AND rated_player_id = v_rating.rated_player_id
        ) THEN
            -- Keep the most recent rating
            UPDATE player_ratings
            SET attack_rating = v_rating.attack_rating,
                defense_rating = v_rating.defense_rating,
                game_iq_rating = v_rating.game_iq_rating,
                updated_at = GREATEST(updated_at, v_rating.updated_at)
            WHERE rater_id = target_player_id
            AND rated_player_id = v_rating.rated_player_id
            AND updated_at < v_rating.updated_at;

            -- Delete the source rating
            DELETE FROM player_ratings
            WHERE id = v_rating.id;
        ELSE
            -- No conflict, update the rating
            UPDATE player_ratings
            SET rater_id = target_player_id
            WHERE id = v_rating.id;
        END IF;
    END LOOP;

    -- Update rated_player_id references
    UPDATE player_ratings
    SET rated_player_id = target_player_id
    WHERE rated_player_id = source_player_id;

    -- Handle notifications
    UPDATE notifications
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    -- Handle player penalties
    UPDATE player_penalties
    SET player_id = target_player_id
    WHERE player_id = source_player_id;

    -- =====================================================
    -- Handle player_awards (trophies)
    -- =====================================================

    -- Update awards where source player is the main recipient
    -- Only transfer if target doesn't already have the same award
    UPDATE player_awards
    SET player_id = target_player_id
    WHERE player_id = source_player_id
    AND NOT EXISTS (
        SELECT 1 FROM player_awards pa2
        WHERE pa2.player_id = target_player_id
        AND pa2.award_category = player_awards.award_category
        AND pa2.award_year IS NOT DISTINCT FROM player_awards.award_year
        AND pa2.medal_type = player_awards.medal_type
    );

    -- Delete any remaining awards that couldn't be transferred (duplicates)
    DELETE FROM player_awards
    WHERE player_id = source_player_id;

    -- Update partner references (for duo awards like dynamic_duo, best_buddies)
    UPDATE player_awards
    SET partner_id = target_player_id
    WHERE partner_id = source_player_id;

    -- Update partner2 references (for trio awards like dream_team_trio)
    UPDATE player_awards
    SET partner2_id = target_player_id
    WHERE partner2_id = source_player_id;

    -- =====================================================
    -- END: Handle player_awards
    -- =====================================================

    -- Finally delete the source player
    DELETE FROM players
    WHERE id = source_player_id;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
        RETURN FALSE;
END;
$function$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.merge_players(uuid, uuid) IS
'Merges source player into target player, transferring all data including:
- Ratings and rating history
- Game registrations (with conflict resolution)
- Tokens and token history
- XP and XP snapshots (including xp_v2)
- Admin roles
- Notifications
- Penalties
- Player awards/trophies
The source player is deleted after all data is transferred.
Updated Jan 2026: Added xp_v2 to snapshot handling.';
