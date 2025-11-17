# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📚 Documentation Index

**For comprehensive documentation, see [Documentation Index](/docs/INDEX.md)**

This CLAUDE.md contains only critical patterns and quick references. Detailed information is available in supplementary documentation files.

---

## ⚡ Quick Start

### Development Commands

```bash
npm install    # Install dependencies
npm run dev    # Start development server on http://localhost:5173
npm run build  # TypeScript check + production build
npm run lint   # ESLint checks (max warnings: 0)
```

### Important Reminder

**Always run `date` command before adding/editing documentation** to ensure accurate timestamps.

---

## 🔧 Critical Coding Patterns

### Rating System - Null Safety

**ALWAYS** use null-safe operators when working with ratings:

```typescript
// ✅ CORRECT
const attack = player.attack ?? 0;
const gameIq = player.game_iq ?? 0;
const avgGK = player.average_gk_rating ?? 0;

// Use formatRating() utility
import { formatRating } from '@/utils/ratingFormatters';
const displayValue = formatRating(player.attack); // "7.5" or "unrated"

// ❌ WRONG - Will fail on null
const attack = player.attack;
```

**All rating interfaces must include all four core metrics:** Attack, Defense, Game IQ, GK

### Database Column Naming - Critical Difference!

**`players` table:**
```typescript
game_iq              // NOT game_iq_rating!
attack, defense, gk  // NOT attack_rating, etc.
```

**`player_ratings` table:**
```typescript
game_iq_rating  // NOT game_iq!
attack_rating, defense_rating, gk_rating
```

**Wrong column names cause "column not found" errors!**

### Position System

Use centralized constants:

```typescript
import { POSITIONS, POSITION_CATEGORIES } from '@/constants/positions';

// 12 positions: GK, LB, CB, RB, LWB, RWB, LW, CM, RW, CAM, CDM, ST
// Ranked system: 🥇 Gold (3pts), 🥈 Silver (2pts), 🥉 Bronze (1pt)
```

### RLS Bypass Pattern

Use `p_bypass_permission: true` **ONLY** in trusted system processes:

```typescript
// ✅ CORRECT - Automated system process
await supabase.rpc('update_game_registration', {
  p_registration_id: id,
  p_updates: { status: 'selected' },
  p_bypass_permission: true  // Only for automated processes!
});

// ❌ WRONG - User-initiated action
// Never use bypass for user actions!
```

### Game Participation Index Order

**Critical:** Index 0 = oldest game, Index 39 = most recent

```typescript
// ✅ CORRECT
participation[39 - index] = status;

// ❌ WRONG
participation[index] = status;  // Reversed!
```

### Admin Operations & Service Role Key ⚠️ **CRITICAL**

**NEVER use `supabaseAdmin` client for admin operations in the browser** - it will use the logged-in user's JWT instead of the service role key!

```typescript
// ❌ WRONG - Uses user JWT, causes 403 errors
const { error } = await supabaseAdmin.auth.admin.signOut(userId, 'global')

// ✅ CORRECT - Use direct fetch with explicit service role key
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
})
```

**Why:** Supabase client detects user session in browser and uses user's JWT instead of service role key, even if client was initialized correctly.

**See:** [Recurring Login Issues Fix](/docs/fixes/RecurringLoginIssuesFix.md#service-role-key-vs-user-jwt-issue-november-17-2025)

### SMTP & Email Recovery ⚠️

**Current Status (Nov 2025):** SMTP authentication is BROKEN (error: `535 5.7.8`)

```typescript
// ❌ BROKEN - Don't use until SMTP is configured
await supabaseAdmin.auth.signInWithOtp({ email })
await supabaseAdmin.auth.resetPasswordForEmail(email)

// ✅ WORKAROUND - Use "Set Temp Password" in Session Diagnostics
// Admin Portal → Session Diagnostics → Set Temp Password
```

**Fix:** Configure custom SMTP in Supabase Dashboard → Authentication → Email Templates

---

## 📖 Feature Quick Reference

### Core Systems
- **[Token System](/docs/TokenSystem.md)** - Priority tokens, shield tokens, eligibility
- **[Ratings System](/docs/RatingsSystemGuide.md)** - Attack, Defense, Game IQ, GK, Playstyles, Positions
- **[Team Balancing](/docs/features/TeamBalancing.md)** - Tier-based snake draft algorithm
- **[XP System](/docs/XPSystemExplained.md)** - Experience points and progression

### Recent Major Features (2025)
- **[GK Rating](/docs/features/GKRating.md)** (Oct 2025) - Fourth core metric + permanent GK feature
- **[Position Preferences](/docs/features/PositionPreferences.md)** (Nov 2025) - Ranked position system (Gold/Silver/Bronze)
- **[Playstyle System](/docs/features/PlaystyleRatingSystem.md)** (Sep 2025) - 24 playstyles with 6 derived attributes
- **[Formation Suggester](/docs/features/FormationSuggester.md)** (Sep 2025) - AI-powered tactical recommendations

### Admin Systems
- **[RBAC](/docs/systems/AdminSystems.md#rbac)** - Role-based access control
- **[View As](/docs/systems/AdminSystems.md#view-as)** - Permission emulation for testing
- **[Feature Flags](/docs/systems/AdminSystems.md#feature-flags)** - Controlled rollouts and kill switches

---

## 🛠️ Technical Guides

### Development Patterns
- **[Core Development Patterns](/docs/systems/CoreDevelopmentPatterns.md)** - Essential coding conventions ⭐
- **[Database Patterns](/docs/systems/DatabasePatterns.md)** - RLS, triggers, migrations ⭐
- **[Team Balancing Algorithm Evolution](/docs/algorithms/TeamBalancingEvolution.md)** - Complete algorithm history

### Component Documentation
See [Documentation Index - Components Section](/docs/INDEX.md#components) for all UI component docs.

---

## 🐛 Common Issues & Fixes

**Query Limits:**
- Supabase has 1000 row limit
- Use batch fetching or pre-filtering
- See [Database Patterns - Query Optimization](/docs/systems/DatabasePatterns.md#query-optimization-patterns)

**Rating Averages:**
- Always exclude NULL from averages
- Use AVG() function, not manual calculation
- See [Core Patterns - Rating System](/docs/systems/CoreDevelopmentPatterns.md#rating-system-patterns)

**Mobile Responsiveness:**
- Hide columns on small screens: `className="hidden lg:table-cell"`
- Abbreviated labels: `<span className="sm:hidden">All</span>`
- See [Core Patterns - UI/UX](/docs/systems/CoreDevelopmentPatterns.md#uiux-patterns)

---

## 🎯 Algorithm Details (User-Facing Content)

**Important:** When documenting team balancing in user-facing content, keep algorithm details **vague** to prevent gaming the system.

✅ **Good (vague):** "The algorithm considers multiple factors beyond just ratings"

❌ **Too specific:** "Uses 60% core skills, 20% attributes, 20% performance"

---

## 🔄 Git Workflow

### Committing Changes

When user asks to create a commit:

1. Run `git status` and `git diff` in parallel
2. Analyze changes and draft commit message
3. Add files and create commit with standard footer:

```bash
git commit -m "$(cat <<'EOF'
[Commit message here]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

4. **Do NOT push** unless explicitly requested
5. **Ask if user wants to use Git MCP server** instead of bash commands

### Creating Pull Requests

1. Check current branch status and commit history
2. Draft PR summary analyzing ALL commits (not just latest!)
3. Push to remote if needed
4. Create PR using:

```bash
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
- [Bullet points]

## Test plan
- [Checklist]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 📋 Pre-Commit Checklist

Before committing rating-related changes:
- [ ] Used null-safe operators (`??`, `?.`)
- [ ] Correct column names (game_iq vs game_iq_rating)
- [ ] Used `formatRating()` utility
- [ ] All four metrics included (Attack/Defense/Game IQ/GK)

Before committing database changes:
- [ ] Migration file properly named (YYYYMMDD_description.sql)
- [ ] Used IF NOT EXISTS / IF EXISTS
- [ ] RLS policies updated
- [ ] Tested with sample data

Before committing UI changes:
- [ ] Mobile responsive (test on small screens)
- [ ] Null-safe rendering
- [ ] Loading states handled

---

## 🗺️ Codebase Structure

```
src/
├── components/          # UI components
│   ├── admin/          # Admin-specific components
│   ├── ratings/        # Rating system components
│   └── player-card/    # Player display components
├── hooks/              # React hooks
├── pages/              # Page components
│   ├── admin/          # Admin portal pages
│   └── ...
├── utils/              # Utility functions
├── constants/          # Constants and enums
└── types/              # TypeScript type definitions

docs/
├── INDEX.md            # Master documentation index ⭐
├── systems/            # Technical system guides
├── features/           # Feature documentation
├── algorithms/         # Algorithm documentation
├── components/         # Component-specific docs
└── fixes/              # Bug fix documentation
```

---

## 🎓 Learning Resources

**New to the codebase?** Start here:
1. Read [Core Development Patterns](/docs/systems/CoreDevelopmentPatterns.md)
2. Review [Database Patterns](/docs/systems/DatabasePatterns.md)
3. Browse [Documentation Index](/docs/INDEX.md) for specific topics
4. Check [Team Balancing Algorithm Evolution](/docs/algorithms/TeamBalancingEvolution.md) for algorithm context

**Working on a specific feature?** Find detailed docs in [Documentation Index](/docs/INDEX.md).

---

## 💡 Tips for Claude Code

- **Always use Task tool** for complex multi-round searches/explorations
- **Read relevant documentation** before making changes
- **Check existing patterns** in similar components
- **Test edge cases** (null values, mobile screens, empty states)
- **Update documentation** when adding new features or patterns
- **Keep user-facing content vague** about algorithm specifics

---

**For detailed documentation on any topic, see: [Documentation Index](/docs/INDEX.md)**
