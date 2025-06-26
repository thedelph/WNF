# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memories
- Run date via base before adding/editing any documentation to ensure you've got the correct date.
- Academy tier added (2025-06-18): Players with 0 caps and 0 XP are now "Academy" (deep teal gradient), while players with >0 caps and 0 XP remain "Retired" (black). This distinction helps differentiate new players from inactive ones.
- When the user wants to commit changes to GitHub, ask if they'd like to use the Git MCP server commands instead of bash git commands.
- Team Announcement Phase enhanced (2025-06-18): Now supports two-stage pasting - first paste player registration message, then team announcement message with 🟠 Orange Team and 🔵 Blue Team sections. Attack/Defense ratings removed from game creation form. Default pitch cost updated to £54.
- Game IQ Rating added (2025-06-26): Third rating metric alongside Attack and Defense. Measures tactical awareness, positioning, and decision-making (0-10 scale, displayed as 0-5 stars). Team balancing now uses 5 metrics with 20% weighting each: Attack, Defense, Game IQ, Win Rate, Goal Differential. Database columns: `game_iq_rating` in player_ratings, `game_iq` and `average_game_iq_rating` in players table.
- Game IQ Implementation Details (2025-06-26): When working with player ratings, always handle null values using nullish coalescing (`??`) or optional chaining (`?.`). The admin ratings page uses OR logic for filtering (shows players with at least one non-zero rating). Rating interfaces must include `gameIq` in addition to `attack` and `defense`. All player rating displays should show Game IQ alongside Attack and Defense ratings.
- Game IQ Display Improvements (2025-06-26): Unrated values show as "unrated" instead of "0" or "NaN". Created `formatRating()` and `formatStarRating()` helper functions in `/src/utils/ratingFormatters.ts`. Rating buttons show contextual text: "ADD GAME IQ RATING" when only Game IQ is missing, "COMPLETE RATING" when multiple ratings are missing, "UPDATE RATING" when all ratings exist.
- Changelog Management: Version 1.2.0 added for Game IQ feature. When documenting team balancing changes in user-facing content, keep algorithm details vague to prevent gaming the system. Players can rate other players (not just teammates) after playing 5+ games together.
- Ratings Explanation Component (2025-06-26): Added expandable/collapsible explanation section to ratings page using Framer Motion. Component path: `/src/components/ratings/RatingsExplanation.tsx`. Explains that ratings should consider both skill AND position tendency (e.g., a skilled defender who rarely plays defense should have a lower defense rating). Emphasizes confidentiality and importance of honest ratings. Keep algorithm details vague - only mention it "considers multiple factors beyond just ratings" without specifics.
- Admin Ratings Page Fix (2025-06-26): Fixed Game IQ ratings not displaying in admin panel. Issue was in `useRaterStats` hook missing `game_iq_rating` in select query. Also added `updated_at` column to `player_ratings` table with auto-update trigger, so admin can see when ratings were last modified instead of just creation date.
- Changelog Deep Linking (2025-06-26): Added URL fragment support to link directly to specific changelog versions. Access via `http://localhost:5173/changelog#1.2.0` format. The linked version auto-expands with all sections (Added/Changed/Fixed) visible. Implementation uses refs to control DaisyUI collapse component state. Existing "Expand All"/"Collapse All" functionality remains intact.
- Admin Players Page Mobile Improvements (2025-06-26): Made admin players management page mobile-friendly. Key changes: responsive header controls with stacked layout, mobile-optimized search bar (full width), abbreviated button labels on mobile, hidden table columns (Caps/XP) with inline badges, mobile-specific "Select All" button, improved touch targets with appropriate sizing (btn-sm/btn-xs), reduced container padding. Pattern can be applied to other admin pages for consistency.

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

[... rest of the existing content remains unchanged ...]