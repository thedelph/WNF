# Payment Notification System

## Overview
The payment notification system manages notifications for game payment requests and automatically handles their lifecycle based on payment status changes.

## Database Triggers

### `delete_payment_notification_on_verify`
This trigger automatically removes payment request notifications when an admin verifies a player's payment for a game.

#### Trigger Details
- **Table**: `game_registrations`
- **Timing**: AFTER UPDATE
- **Function**: `delete_payment_request_notification()`
- **Purpose**: Prevents duplicate payments by removing payment request notifications once an admin has verified the payment

#### How it Works
1. When an admin updates a game registration's `payment_status` to 'admin_verified':
   - The trigger automatically fires
   - Finds any payment request notifications for that specific game and player
   - Deletes those notifications to prevent duplicate payment requests

#### Technical Implementation
The trigger uses a function that:
- Checks if the UPDATE operation changes `payment_status` to 'admin_verified'
- Queries the notifications table for matching payment requests
- Deletes notifications where:
  - `type = 'payment_request'`
  - `player_id` matches the updated registration
  - The `game_id` in the notification metadata matches the updated registration

## Related Components
- `NotificationItem.tsx`: Renders payment request notifications with a "Pay Now" button
- Game registration system: Updates payment status when admins verify payments

## Security
- The trigger function runs with SECURITY DEFINER to ensure proper permissions
- Only triggers on specific payment status changes
- Only removes notifications for the specific game and player combination being verified
