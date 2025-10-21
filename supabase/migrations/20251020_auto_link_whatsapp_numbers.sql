-- Migration: Auto-link WhatsApp Numbers to Player Profiles
-- Description: Automatically sets whatsapp_group_member to 'Yes' when a phone number is added
-- Date: 2025-10-20

-- =====================================================
-- STEP 1: Update existing players with phone numbers
-- =====================================================

-- Update any existing players who have a phone number but no group member status
UPDATE players
SET whatsapp_group_member = 'Yes'
WHERE whatsapp_mobile_number IS NOT NULL
  AND whatsapp_mobile_number != ''
  AND (whatsapp_group_member IS NULL OR whatsapp_group_member = '');

-- =====================================================
-- STEP 2: Create trigger function for automatic linking
-- =====================================================

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS auto_link_whatsapp_number() CASCADE;

-- Create trigger function
CREATE OR REPLACE FUNCTION auto_link_whatsapp_number()
RETURNS TRIGGER AS $$
BEGIN
  -- If a phone number is being set and group member status is NULL or empty,
  -- automatically set it to 'Yes'
  IF NEW.whatsapp_mobile_number IS NOT NULL
     AND NEW.whatsapp_mobile_number != ''
     AND (NEW.whatsapp_group_member IS NULL OR NEW.whatsapp_group_member = '') THEN
    NEW.whatsapp_group_member := 'Yes';
  END IF;

  -- If phone number is being removed, optionally clear the group member status
  -- (Uncomment the lines below if you want this behavior)
  -- IF (NEW.whatsapp_mobile_number IS NULL OR NEW.whatsapp_mobile_number = '')
  --    AND (OLD.whatsapp_mobile_number IS NOT NULL AND OLD.whatsapp_mobile_number != '') THEN
  --   NEW.whatsapp_group_member := NULL;
  -- END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: Create trigger on players table
-- =====================================================

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_link_whatsapp_number ON players;

-- Create trigger that fires before INSERT or UPDATE
CREATE TRIGGER trigger_auto_link_whatsapp_number
  BEFORE INSERT OR UPDATE OF whatsapp_mobile_number, whatsapp_group_member
  ON players
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_whatsapp_number();

-- =====================================================
-- STEP 4: Add comment for documentation
-- =====================================================

COMMENT ON FUNCTION auto_link_whatsapp_number() IS
  'Automatically sets whatsapp_group_member to ''Yes'' when a phone number is added to a player profile. This ensures data consistency and automatically links players who have WhatsApp numbers in the database.';

COMMENT ON TRIGGER trigger_auto_link_whatsapp_number ON players IS
  'Automatically links WhatsApp numbers to player profiles by setting group member status to ''Yes'' when a phone number is added.';
