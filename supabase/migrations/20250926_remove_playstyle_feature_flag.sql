-- Remove playstyle_ratings feature flag
-- The playstyle feature has been live for all users since 2025-09-17
-- and is no longer needed as a feature flag

-- Temporarily disable the trigger to avoid foreign key issues
ALTER TABLE feature_flags DISABLE TRIGGER log_feature_flag_changes;

-- Delete any related audit records first
DELETE FROM feature_flag_audit
WHERE flag_id IN (
    SELECT id FROM feature_flags WHERE name = 'playstyle_ratings'
);

-- Delete the feature flag
DELETE FROM feature_flags WHERE name = 'playstyle_ratings';

-- Re-enable the trigger
ALTER TABLE feature_flags ENABLE TRIGGER log_feature_flag_changes;