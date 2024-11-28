-- Add pitch_cost to venue_presets if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'venue_presets' AND column_name = 'pitch_cost') THEN
        ALTER TABLE venue_presets ADD COLUMN pitch_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;
