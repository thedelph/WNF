-- Add columns to track most common playstyle for specialist detection
ALTER TABLE player_derived_attributes
ADD COLUMN IF NOT EXISTS most_common_playstyle_id UUID REFERENCES playstyles(id),
ADD COLUMN IF NOT EXISTS most_common_playstyle_confidence DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS most_common_custom_attributes JSONB,
ADD COLUMN IF NOT EXISTS playstyle_distribution JSONB DEFAULT '{}';

-- Update the trigger function to track playstyle distribution
CREATE OR REPLACE FUNCTION update_player_derived_attributes()
RETURNS TRIGGER AS $$
DECLARE
    v_pace_total DECIMAL(10,2) := 0;
    v_shooting_total DECIMAL(10,2) := 0;
    v_passing_total DECIMAL(10,2) := 0;
    v_dribbling_total DECIMAL(10,2) := 0;
    v_defending_total DECIMAL(10,2) := 0;
    v_physical_total DECIMAL(10,2) := 0;
    v_playstyle_rating_count INT := 0;
    v_pace_avg DECIMAL(3,2);
    v_shooting_avg DECIMAL(3,2);
    v_passing_avg DECIMAL(3,2);
    v_dribbling_avg DECIMAL(3,2);
    v_defending_avg DECIMAL(3,2);
    v_physical_avg DECIMAL(3,2);
    v_playstyle_distribution JSONB;
    v_most_common_playstyle_id UUID;
    v_most_common_custom_attrs JSONB;
    v_most_common_count INT;
    v_total_playstyle_ratings INT;
    v_confidence DECIMAL(3,2);
BEGIN
    -- Count only ratings that have playstyle data (either playstyle_id OR custom attributes)
    SELECT COUNT(*)
    INTO v_playstyle_rating_count
    FROM player_ratings
    WHERE rated_player_id = NEW.rated_player_id
    AND (
        playstyle_id IS NOT NULL
        OR has_pace IS NOT NULL
        OR has_shooting IS NOT NULL
        OR has_passing IS NOT NULL
        OR has_dribbling IS NOT NULL
        OR has_defending IS NOT NULL
        OR has_physical IS NOT NULL
    );

    -- Calculate weighted sum from ratings that have playstyle data
    SELECT
        COALESCE(SUM(
            CASE
                WHEN pr.playstyle_id IS NOT NULL THEN ps.pace_weight
                WHEN pr.has_pace = true THEN 1.0
                ELSE 0.0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN pr.playstyle_id IS NOT NULL THEN ps.shooting_weight
                WHEN pr.has_shooting = true THEN 1.0
                ELSE 0.0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN pr.playstyle_id IS NOT NULL THEN ps.passing_weight
                WHEN pr.has_passing = true THEN 1.0
                ELSE 0.0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN pr.playstyle_id IS NOT NULL THEN ps.dribbling_weight
                WHEN pr.has_dribbling = true THEN 1.0
                ELSE 0.0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN pr.playstyle_id IS NOT NULL THEN ps.defending_weight
                WHEN pr.has_defending = true THEN 1.0
                ELSE 0.0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN pr.playstyle_id IS NOT NULL THEN ps.physical_weight
                WHEN pr.has_physical = true THEN 1.0
                ELSE 0.0
            END
        ), 0)
    INTO
        v_pace_total,
        v_shooting_total,
        v_passing_total,
        v_dribbling_total,
        v_defending_total,
        v_physical_total
    FROM player_ratings pr
    LEFT JOIN playstyles ps ON pr.playstyle_id = ps.id
    WHERE pr.rated_player_id = NEW.rated_player_id
    AND (
        pr.playstyle_id IS NOT NULL
        OR pr.has_pace IS NOT NULL
        OR pr.has_shooting IS NOT NULL
        OR pr.has_passing IS NOT NULL
        OR pr.has_dribbling IS NOT NULL
        OR pr.has_defending IS NOT NULL
        OR pr.has_physical IS NOT NULL
    );

    -- Calculate averages from ratings with playstyle data only
    IF v_playstyle_rating_count > 0 THEN
        v_pace_avg := v_pace_total / v_playstyle_rating_count;
        v_shooting_avg := v_shooting_total / v_playstyle_rating_count;
        v_passing_avg := v_passing_total / v_playstyle_rating_count;
        v_dribbling_avg := v_dribbling_total / v_playstyle_rating_count;
        v_defending_avg := v_defending_total / v_playstyle_rating_count;
        v_physical_avg := v_physical_total / v_playstyle_rating_count;
    ELSE
        -- Default values when no playstyle ratings exist
        v_pace_avg := 0;
        v_shooting_avg := 0;
        v_passing_avg := 0;
        v_dribbling_avg := 0;
        v_defending_avg := 0;
        v_physical_avg := 0;
    END IF;

    -- Track playstyle distribution and find most common
    WITH playstyle_counts AS (
        SELECT
            CASE
                WHEN pr.playstyle_id IS NOT NULL THEN
                    jsonb_build_object('type', 'predefined', 'id', pr.playstyle_id::text, 'name', ps.name)
                ELSE
                    jsonb_build_object(
                        'type', 'custom',
                        'attributes', jsonb_build_object(
                            'has_pace', COALESCE(pr.has_pace, false),
                            'has_shooting', COALESCE(pr.has_shooting, false),
                            'has_passing', COALESCE(pr.has_passing, false),
                            'has_dribbling', COALESCE(pr.has_dribbling, false),
                            'has_defending', COALESCE(pr.has_defending, false),
                            'has_physical', COALESCE(pr.has_physical, false)
                        )
                    )
            END as playstyle_data,
            COUNT(*) as count
        FROM player_ratings pr
        LEFT JOIN playstyles ps ON pr.playstyle_id = ps.id
        WHERE pr.rated_player_id = NEW.rated_player_id
        AND (
            pr.playstyle_id IS NOT NULL
            OR pr.has_pace IS NOT NULL
            OR pr.has_shooting IS NOT NULL
            OR pr.has_passing IS NOT NULL
            OR pr.has_dribbling IS NOT NULL
            OR pr.has_defending IS NOT NULL
            OR pr.has_physical IS NOT NULL
        )
        GROUP BY
            pr.playstyle_id,
            ps.name,
            pr.has_pace,
            pr.has_shooting,
            pr.has_passing,
            pr.has_dribbling,
            pr.has_defending,
            pr.has_physical
    ),
    distribution AS (
        SELECT
            jsonb_object_agg(
                CASE
                    WHEN (playstyle_data->>'type') = 'predefined' THEN playstyle_data->>'name'
                    ELSE 'custom_' || encode(sha256((playstyle_data->>'attributes')::bytea), 'hex')::text
                END,
                count
            ) as distribution_json,
            SUM(count) as total_count
        FROM playstyle_counts
    ),
    most_common AS (
        SELECT
            playstyle_data,
            count
        FROM playstyle_counts
        ORDER BY count DESC
        LIMIT 1
    )
    SELECT
        d.distribution_json,
        d.total_count,
        mc.playstyle_data,
        mc.count
    INTO
        v_playstyle_distribution,
        v_total_playstyle_ratings,
        v_most_common_custom_attrs,
        v_most_common_count
    FROM distribution d
    CROSS JOIN most_common mc;

    -- Extract most common playstyle ID if it's predefined
    IF v_most_common_custom_attrs IS NOT NULL AND (v_most_common_custom_attrs->>'type') = 'predefined' THEN
        v_most_common_playstyle_id := (v_most_common_custom_attrs->>'id')::UUID;
        v_most_common_custom_attrs := NULL;
    ELSIF v_most_common_custom_attrs IS NOT NULL AND (v_most_common_custom_attrs->>'type') = 'custom' THEN
        v_most_common_playstyle_id := NULL;
        v_most_common_custom_attrs := v_most_common_custom_attrs->'attributes';
    END IF;

    -- Calculate confidence (percentage of ratings that match the most common)
    IF v_total_playstyle_ratings > 0 THEN
        v_confidence := v_most_common_count::DECIMAL / v_total_playstyle_ratings::DECIMAL;
    ELSE
        v_confidence := 0;
    END IF;

    -- Insert or update the derived attributes
    INSERT INTO player_derived_attributes (
        player_id,
        pace_rating,
        shooting_rating,
        passing_rating,
        dribbling_rating,
        defending_rating,
        physical_rating,
        total_ratings_count,
        most_common_playstyle_id,
        most_common_playstyle_confidence,
        most_common_custom_attributes,
        playstyle_distribution,
        updated_at
    ) VALUES (
        NEW.rated_player_id,
        v_pace_avg,
        v_shooting_avg,
        v_passing_avg,
        v_dribbling_avg,
        v_defending_avg,
        v_physical_avg,
        v_playstyle_rating_count,
        v_most_common_playstyle_id,
        v_confidence,
        v_most_common_custom_attrs,
        COALESCE(v_playstyle_distribution, '{}'::jsonb),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (player_id) DO UPDATE SET
        pace_rating = v_pace_avg,
        shooting_rating = v_shooting_avg,
        passing_rating = v_passing_avg,
        dribbling_rating = v_dribbling_avg,
        defending_rating = v_defending_avg,
        physical_rating = v_physical_avg,
        total_ratings_count = v_playstyle_rating_count,
        most_common_playstyle_id = v_most_common_playstyle_id,
        most_common_playstyle_confidence = v_confidence,
        most_common_custom_attributes = v_most_common_custom_attrs,
        playstyle_distribution = COALESCE(v_playstyle_distribution, '{}'::jsonb),
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recalculate all existing player derived attributes to populate the new fields
DO $$
DECLARE
    player_record RECORD;
BEGIN
    -- For each player with ratings, trigger a recalculation
    FOR player_record IN
        SELECT DISTINCT rated_player_id
        FROM player_ratings
        WHERE (
            playstyle_id IS NOT NULL
            OR has_pace IS NOT NULL
            OR has_shooting IS NOT NULL
            OR has_passing IS NOT NULL
            OR has_dribbling IS NOT NULL
            OR has_defending IS NOT NULL
            OR has_physical IS NOT NULL
        )
    LOOP
        -- Update a dummy row to trigger the function
        UPDATE player_ratings
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = (
            SELECT id
            FROM player_ratings
            WHERE rated_player_id = player_record.rated_player_id
            LIMIT 1
        );
    END LOOP;
END;
$$;