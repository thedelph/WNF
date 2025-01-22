-- Create a function to delete payment request notifications
CREATE OR REPLACE FUNCTION delete_payment_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if payment_status is being updated to 'admin_verified'
    IF (TG_OP = 'UPDATE' AND NEW.payment_status = 'admin_verified') THEN
        -- Delete the payment_request notification for this game and player
        DELETE FROM notifications 
        WHERE type = 'payment_request' 
        AND player_id = NEW.player_id 
        AND metadata::jsonb->>'game_id' = NEW.game_id::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that runs after updating game_registrations
CREATE TRIGGER delete_payment_notification_on_verify
    AFTER UPDATE ON game_registrations
    FOR EACH ROW
    EXECUTE FUNCTION delete_payment_request_notification();

-- Add a comment to explain the trigger
COMMENT ON TRIGGER delete_payment_notification_on_verify ON game_registrations IS 
'Automatically deletes the payment_request notification when a game registration payment is verified by an admin';
