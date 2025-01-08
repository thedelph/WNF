# Game Completion Form Documentation

## Overview
The GameCompletionForm is a React component that handles the administrative process of completing a game session. It provides an interface for administrators to record game outcomes, manage team assignments, track payment statuses, and send payment notifications to players.

## Key Features

### 1. Game Score and Outcome Management
- Allows input of scores for both Blue and Orange teams
- Automatically determines game outcome based on scores
- Validates that the selected outcome matches the input scores
- Supports three outcomes: Blue Win, Orange Win, or Draw

### 2. Team Management
- Displays players in Blue and Orange team sections
- Allows administrators to:
  - Assign/reassign players to teams
  - Select/deselect players who participated
  - Track the number of players per team

### 3. Payment Tracking
- Manages payment status for each player:
  - Unpaid (default)
  - Marked Paid
  - Admin Verified
- Supports Monzo payment link integration
- Automatically sends payment notifications to selected players

## Technical Implementation

### State Management
The component uses React's useState hook to manage:
- Team scores (scoreBlue, scoreOrange)
- Game outcome
- Payment link
- Player information and team assignments
- Loading state

### Data Flow
1. Initial Load:
   - Fetches existing game players and their team assignments
   - Loads any pre-existing game data (scores, outcome)

2. Form Submission:
   - Updates game details in Supabase
   - Updates player selections and team assignments
   - Sends payment notifications to selected players

### Database Interactions
- Reads from and writes to the following Supabase tables:
  - games
  - game_registrations
  - notifications

## Component Structure
The GameCompletionForm has been modularized into several smaller components for better maintainability:

### Directory Structure
```
src/components/admin/history/game-completion/
├── types.ts              # Shared TypeScript interfaces
├── GameCompletionForm.tsx # Main component
├── ScoreInput.tsx        # Score input component
├── GameOutcome.tsx       # Game outcome selection component
└── TeamSection.tsx       # Team management component
```

### Component Breakdown

1. **GameCompletionForm** (`GameCompletionForm.tsx`)
   - Main container component
   - Handles form state and submission
   - Manages API interactions
   - Coordinates child components

2. **ScoreInput** (`ScoreInput.tsx`)
   - Reusable component for score input
   - Handles individual team score entry
   - Input validation and formatting

3. **GameOutcome** (`GameOutcome.tsx`)
   - Manages game outcome selection
   - Validates outcome against scores
   - Provides visual feedback for invalid selections

4. **TeamSection** (`TeamSection.tsx`)
   - Handles team-specific player management
   - Player selection and team assignment
   - Payment status tracking
   - Responsive team display

### Types (`types.ts`)
Contains shared TypeScript interfaces for:
- Component props
- Player data structures
- Form state types

## Props
```typescript
interface Props {
  game: Game;           // Game object containing game details
  onComplete: () => void; // Callback function called after successful completion
}
```

## User Interface
- Responsive layout with Tailwind CSS and DaisyUI
- Animated transitions using Framer Motion
- Form validation with error messages
- Real-time updates for team assignments and payment status

## Error Handling
- Validates form completeness
- Ensures outcome matches scores
- Provides toast notifications for success/failure
- Includes error logging for debugging

## Best Practices
- Implements proper type checking with TypeScript
- Uses proper form validation
- Includes loading states for better UX
- Implements error boundaries and proper error handling
- Uses async/await for database operations
