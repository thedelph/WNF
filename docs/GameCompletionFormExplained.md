# Game Completion Form Documentation

## Overview
The Game Completion Form is used to record the final details of a completed game, including scores, teams, player statuses, and payment information. It provides a comprehensive interface for managing all aspects of game completion.

## Components

### Main Form (`GameCompletionForm.tsx`)
- Handles the overall game completion process
- Manages scores, team assignments, and player statuses
- Provides interfaces for payment tracking
- Allows last-minute player additions and changes

#### Key Features
1. **Score Management**
   - Blue Team Score input
   - Orange Team Score input
   - Automatic game outcome determination based on scores

2. **Team Management**
   - Split view showing Blue and Orange teams
   - Player assignment to teams
   - Player status tracking (Selected, Available, Reserve)
   - Payment status tracking per player

3. **Player Search and Addition**
   - Real-time search across all registered players
   - Ability to add players who weren't originally registered
   - Immediate team/status assignment for new additions

4. **Reserve System**
   - Two reserve statuses:
     - "Reserve - No Slot Offer": Default status for reserve players
     - "Reserve - Declined Slot": For players who declined an offered slot
   - Automatic team removal when marked as reserve

### Team Section (`TeamSection.tsx`)
- Displays team-specific information
- Handles player status changes
- Manages payment status updates

#### Features
1. **Player Display**
   - Selected Players: Currently on the team
   - Available Players: Not assigned to any team
   - Reserve Players: In reserve pool

2. **Status Management**
   - Team assignment dropdown
   - Reserve status options
   - Payment status tracking

### Player Search (`PlayerSearch.tsx`)
- Enables adding new players to the game
- Provides real-time search functionality
- Allows immediate team/status assignment

#### Features
1. **Search Functionality**
   - Real-time player search
   - Filters out already added players
   - Shows player friendly names

2. **Addition Options**
   - Team assignment (Blue/Orange)
   - Status selection
   - Initial payment status setting

## Data Flow

### Player Data Structure
```typescript
interface PlayerWithTeam {
  id: string
  friendly_name: string
  team: 'blue' | 'orange' | null
  status: 'selected' | 'registered' | 'reserve_no_offer' | 'reserve_declined'
  payment_status: 'unpaid' | 'marked_paid' | 'admin_verified'
}
```

### Database Interactions
1. **Fetching Players**
   - Gets game registrations for specific game
   - Retrieves player details in separate query
   - Combines data with proper status mapping

2. **Updating Players**
   - Updates team assignments
   - Manages reserve status changes
   - Tracks payment status updates

3. **Adding Players**
   - Creates new game registration
   - Sets initial team and status
   - Establishes payment tracking

## Usage Guidelines

### Completing a Game
1. Enter final scores for both teams
2. Verify player assignments are correct
3. Update payment statuses as needed
4. Add any last-minute player changes
5. Submit the completed game

### Managing Reserves
1. Players can be marked as reserve through the dropdown
2. Reserve players are automatically removed from teams
3. Two reserve statuses available:
   - "No Slot Offer": Default reserve status
   - "Declined Slot": For tracking declined offers

### Last-Minute Changes
1. Use the player search to find any registered player
2. Add them to either team or as reserve
3. Adjust their status and payment information as needed
4. Changes are saved automatically

### Payment Tracking
1. Each player has three possible payment statuses:
   - Unpaid: Default status
   - Marked Paid: Player claims payment made
   - Admin Verified: Payment confirmed by admin

## Error Handling
- Validates score inputs
- Prevents duplicate player assignments
- Handles network errors gracefully
- Provides feedback through toast notifications

## Future Enhancements
- Enhanced payment tracking features
- More detailed reserve management
- Additional player statistics
- Improved error reporting
