# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Development Commands

### Local Development
```bash
npm install    # Install dependencies
npm run dev    # Start development server on http://localhost:5173
```

### Build & Production
```bash
npm run build   # TypeScript check + production build
npm run preview # Preview production build locally
```

### Code Quality
```bash
npm run lint    # ESLint checks (max warnings: 0)
```

## Project Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite build tool
- **Styling**: Tailwind CSS + Daisy UI + Radix UI for accessible components
- **Animations**: Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: TanStack Query (5min stale, 30min cache)
- **Notifications**: React Hot Toast
- **Analytics**: Vercel Analytics

### High-Level Architecture

#### Game Flow System
The application manages weekly football games through distinct phases:
1. **Game Creation** → Admin creates game with venue, times, player limits
2. **Registration Open** → Players register, automatic status updates via hooks
3. **Player Selection** → Automatic selection combining:
   - Token priority (guaranteed slots)
   - Merit-based XP selection
   - Random slots with WhatsApp priority
4. **Team Announcement** → Automatic team balancing by attack/defense ratings
5. **Game Completion** → Score tracking, payment management, XP updates

#### XP System
Complex weighted calculation system:
- Recent games worth more XP (20 XP current game → 0 XP after 40 games)
- Streak multipliers: +10% per consecutive game attended
- Bench warmer bonus: +5% per consecutive reserve appearance
- Unpaid games penalty: -50% per unpaid game
- All modifiers apply to total XP (base + reserve)

#### Player Selection Priority
1. **Token Users** (guaranteed slots)
2. **Merit Selection** (by XP with payment penalty: Players with unpaid games moved to bottom, then WhatsApp status → Streak → Caps → Registration time)
3. **Random Selection** (4-tier priority: WhatsApp+paid → Non-WhatsApp+paid → WhatsApp+unpaid → Non-WhatsApp+unpaid, weighted by bench warmer streak)

#### Token System
- One active token per player maximum
- Eligibility: Played 1 of last 10 games, missed last 3 games, no unpaid games
- Token cooldown: Using token pushes player to bottom of next game's selection
- Token forgiveness: Returned if player would have gotten in by merit anyway

### Key Architectural Patterns

#### Database-First Design
- Complex business logic in PostgreSQL functions and triggers
- Materialized views for performance (player_xp, token_status)
- Row-level security for multi-tenancy
- Automatic XP recalculation on relevant changes

#### Component Organization
- **Pages** (`/pages`): Route components only
- **Components** (`/components`): Reusable UI components
- **Hooks** (`/hooks`): Custom React hooks for data/logic
- **Utils** (`/utils`): Pure utility functions
- **Types** (`/types`): TypeScript type definitions

#### Real-time Updates
- Registration status changes poll every 10 seconds
- Team announcements trigger at scheduled times
- Slot offers for dropouts processed automatically

## Critical Implementation Details

### File Size Limits
- Files must stay under 200 lines
- Break up complex components into smaller parts
- Use modular imports and exports

### UK Spelling
- Use UK spelling throughout (e.g., "favourite" not "favorite")
- This applies to code, comments, and documentation

### Component Patterns
```typescript
// Always check for existing components before creating new ones
// Use Radix UI tooltips instead of Daisy UI
// Extensive comments for complex logic
// Follow existing naming conventions exactly
```

### Database Queries
```typescript
// Always use the typed supabase client from utils/supabase.ts
// Handle loading and error states properly
// Use TanStack Query for data fetching with proper cache keys
// For database schema, functions, and migrations: Use Supabase MCP server tools instead of searching .sql files
```

### Authentication
```typescript
// Use AuthContext for user state
// Check permissions via useAdminPermissions hook
// Service role key required for admin operations
```

## Key Business Logic

### Player Cards & Rarity
- Rarity tiers based on XP percentiles: Legendary (top 2%) → Amateur (any XP)
- Cards show: XP, position, friendly name, bonuses/penalties
- Animated card flips, FIFA Ultimate Team styling

### Team Balancing
- Automatic balancing by attack/defense ratings
- Interactive swap interface with preview
- Balance score = |blueAttack - orangeAttack| + |blueDefense - orangeDefense|

### Payment System
- Track game payments per player
- Unpaid games create XP penalties (-50% per unpaid game)
- **Selection penalties**: Players with unpaid games moved to bottom of both merit and random selection
- Admin payment dashboard with Monzo integration
- Maximum disincentive for missing payments across all selection methods

### Reserve System
- Ordered by WhatsApp status, then payment status (no unpaid games first), then XP
- Automatic slot offers on dropouts
- +5 XP per reserve appearance
- Weighted random selection based on bench warmer streak
- Reserve players get boosted chances for next week's random selection

### WhatsApp Integration
- Contextual message generation for all game phases (GameCard.tsx)
- Selection reasoning summaries with visual indicators (🪙 tokens, 🎲 random, 💰 unpaid)
- Automatic payment penalty indicators in player announcements
- Reserve streak bonus explanation to encourage continued participation
- One-click message copying with comprehensive game information

## Environment Setup

Required environment variables in `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_SERVICE_ROLE_KEY=
```

## Common Development Tasks

### Adding New Features
1. Check existing components/hooks first
2. Follow established patterns in similar features
3. Update relevant documentation in `/docs`
4. Ensure proper TypeScript types
5. Add comprehensive comments

### Debugging XP Calculations
- Check `calculate_player_xp()` PostgreSQL function
- Verify game completion status and is_historical flag
- Review reserve_xp_transactions table
- Use player_xp materialized view for current values

### Working with Player Selection
- Token users always displayed first
- Selection happens automatically on registration close via `process_registration_close()` database function
- **Payment penalty system**: Players with unpaid games are deprioritized in ALL selection methods
- Merit ordering: Payment status (no unpaid first) → XP → WhatsApp status → tiebreakers
- Random ordering: 4-tier priority system (WhatsApp+paid → Non-WhatsApp+paid → WhatsApp+unpaid → Non-WhatsApp+unpaid)
- Reserve ordering: WhatsApp status → Payment status → XP → tiebreakers
- Simulation available in admin GameCard.tsx with detailed reasoning tables

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Use type imports: `import type { ... }`
- Avoid `any` type
- Proper null/undefined handling with `??` operator

### React
- Functional components only
- Custom hooks for logic extraction
- Proper dependency arrays in useEffect
- Error boundaries for robustness

### Styling
- Tailwind utility classes preferred
- Component-specific styles in same file
- Consistent spacing and responsive design
- Dark mode considered but not implemented
```