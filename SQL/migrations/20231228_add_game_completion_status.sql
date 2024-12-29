-- Add new game status
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check 
CHECK (status IN ('created', 'registration_open', 'teams_announced', 'pending_completion', 'completed'));

-- Add payment status to game_registrations
ALTER TABLE game_registrations 
ADD COLUMN IF NOT EXISTS payment_status text 
CHECK (payment_status IN ('unpaid', 'marked_paid', 'admin_verified'));

-- Add payment verified timestamp
ALTER TABLE game_registrations 
ADD COLUMN IF NOT EXISTS payment_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES players(id);

-- Create function to automatically mark games as pending completion
CREATE OR REPLACE FUNCTION check_game_completion_status()
RETURNS trigger AS $$
BEGIN
  -- Check if game is more than 1 hour past kickoff and still in teams_announced status
  IF NEW.status = 'teams_announced' AND 
     NEW.date < (NOW() - INTERVAL '1 hour') THEN
    NEW.status := 'pending_completion';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run the function
DROP TRIGGER IF EXISTS game_completion_status_check ON games;
CREATE TRIGGER game_completion_status_check
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION check_game_completion_status();
