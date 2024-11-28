-- Add payment_received_date to game_registrations
ALTER TABLE game_registrations
ADD COLUMN payment_received_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add pitch_cost to games if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'games' AND column_name = 'pitch_cost') THEN
        ALTER TABLE games ADD COLUMN pitch_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;
