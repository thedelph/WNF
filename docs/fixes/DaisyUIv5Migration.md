# DaisyUI v5 Migration

**Last Updated:** January 8, 2026
**Migration Date:** January 2026
**From Version:** 2.51.6
**To Version:** 5.5.14

## Overview

This document records the migration from DaisyUI v2.51.6 to v5.5.14, including all class changes, configuration updates, and TypeScript fixes that were resolved during the upgrade.

## Key Changes

### 1. Package Update

```bash
npm install daisyui@^5.5.14
```

### 2. CSS Import Order

**Issue:** CSS `@import` statements must precede all other statements.

**Fix:** Move FIFA theme import to top of `src/index.css`:

```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;
@import './styles/fifa-theme.css';

/* After */
@import './styles/fifa-theme.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3. Class Renames

#### Removed Classes

| Old Class | New Behavior |
|-----------|--------------|
| `input-bordered` | Border is now default on inputs |
| `select-bordered` | Border is now default on selects |

#### Tab Classes

| Old Class | New Class |
|-----------|-----------|
| `tabs-boxed` | `tabs-box` |
| `tabs-lifted` | `tabs-lift` |
| `tabs-bordered` | `tabs-border` |

#### Card Classes

| Old Class | New Class |
|-----------|-----------|
| `card-compact` | `card-sm` |
| `card-bordered` | `card-border` |

#### Menu State Classes

| Old Class | New Class |
|-----------|-----------|
| `active` (menu context) | `menu-active` |
| `disabled` (menu context) | `menu-disabled` |

### 4. Form Control Pattern (Optional)

DaisyUI v5 introduces a semantic `fieldset` pattern as best practice:

```tsx
/* Old pattern (still works) */
<div className="form-control">
  <label className="label">
    <span className="label-text">Name</span>
  </label>
  <input className="input" />
</div>

/* New semantic pattern (v5 best practice) */
<fieldset className="fieldset">
  <legend className="fieldset-legend">Name</legend>
  <input className="input" />
  <p className="fieldset-label">Helper text</p>
</fieldset>
```

Note: The old pattern still works. Migration to fieldset is optional but recommended for accessibility.

### 5. Focus Color Classes

| Old Class | Alternative |
|-----------|-------------|
| `text-primary-focus` | `text-primary/80` or hover state |
| `bg-primary-focus` | `bg-primary/80` or hover state |

### 6. Navbar Pattern

The navbar component works best with semantic section classes rather than generic flex utilities inside a container wrapper.

**Old pattern (breaks flex alignment):**
```tsx
<div className="navbar">
  <div className="container mx-auto px-4">
    <div className="flex-1">...</div>
    <div className="flex-none">...</div>
  </div>
</div>
```

**New pattern (v5 best practice):**
```tsx
<div className="navbar px-4">
  <div className="navbar-start">...</div>
  <div className="navbar-end">...</div>
</div>
```

**Available sections:**
- `navbar-start` - Left section (50% width, left-aligned)
- `navbar-center` - Center section (centered)
- `navbar-end` - Right section (50% width, right-aligned)

### 7. Framer Motion Animation Conflicts

**Issue:** Framer Motion `scale` animations conflict with DaisyUI v5 components, causing visual overlap and layout issues.

**Root Cause:** When using `whileHover={{ scale: 1.05 }}` on elements inside DaisyUI components (buttons, tabs, menu items), the scaled element overflows its container and overlaps adjacent elements.

```tsx
/* ❌ WRONG - Causes overlap in DaisyUI v5 */
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="btn btn-primary"
>
  Click me
</motion.button>

/* ✅ CORRECT - Use CSS transitions instead */
<button className="btn btn-primary transition-colors duration-200">
  Click me
</button>
```

**Files fixed:**
- `src/components/layout/Header.tsx` - Removed scale from nav links
- `src/components/leaderboards/LeaderboardsTabs.tsx` - Removed scale from tab buttons
- `src/pages/Ratings.tsx` - Removed scale from action buttons

**Recommendation:** Let DaisyUI handle hover states natively. If animation is needed, use `transition-colors`, `transition-opacity`, or other non-layout-affecting properties.

### 8. Tab Sizing

DaisyUI v5 tabs may appear squashed without explicit size modifiers.

**Fix:** Add `tabs-lg` and padding for proper appearance:

```tsx
/* Properly sized tabs */
<div className="tabs tabs-box tabs-lg bg-base-200">
  <button className="tab px-6">Tab 1</button>
  <button className="tab px-6 tab-active">Tab 2</button>
  <button className="tab px-6">Tab 3</button>
</div>
```

**Size modifiers available:**
- `tabs-xs` - Extra small
- `tabs-sm` - Small
- `tabs-md` - Medium (default)
- `tabs-lg` - Large

### 9. Menu Element Types

DaisyUI v5 menus style `<a>` elements consistently, but `<button>` elements may have inconsistent sizing.

```tsx
/* ✅ CORRECT - Use <a> for consistent menu styling */
<ul className="menu">
  <li><a onClick={handleClick}>Action Item</a></li>
  <li><a href="/page">Link Item</a></li>
</ul>

/* ❌ May have inconsistent sizing */
<ul className="menu">
  <li><button onClick={handleClick}>Button Item</button></li>
</ul>
```

**Note:** Using `<a>` with `onClick` handlers works fine for actions that don't navigate.

## TypeScript Fixes

Several pre-existing TypeScript errors were discovered and fixed during the migration:

### Type Inference Issues

- `executeWithRetry<T>` generic changed to `<T = any>` for better inference
- Import paths corrected for `executeWithRetry` across files

### Interface Updates

- `PlayerStats.token_status.recentGames` aligned with `useTokenStatus` hook output
- Added missing properties to various interfaces
- Fixed `GK` property in `PositionType` records

### Files Updated

- `src/utils/network/queryExecutors.ts` - Generic type default
- `src/types/player.ts` - Token status interface alignment
- `src/utils/teamBalancing/formationSuggester.ts` - GK position handling
- Various component files - Import corrections

## Configuration

### tailwind.config.js

The DaisyUI plugin configuration remains in JavaScript:

```js
module.exports = {
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
  },
};
```

### Custom CSS

Custom fieldset styles added to `src/index.css` for v5 compatibility:

```css
.fieldset {
  @apply space-y-1;
}

.fieldset-legend {
  @apply text-sm font-medium text-gray-700;
}

.fieldset-label {
  @apply text-xs text-gray-500;
}
```

## Testing Checklist

After migration, verify these pages render correctly:

- [ ] Login/Register pages
- [x] Main dashboard (Header fixed)
- [ ] Admin portal (games, players, tokens)
- [ ] Team balancing pages
- [ ] Profile pages
- [ ] Game registration
- [ ] Modals and dropdowns
- [x] Forms and inputs (Ratings page fixed)
- [x] Tables and cards (Ratings page player cards redesigned)
- [x] Mobile responsiveness
- [x] Leaderboards page (tabs fixed)

## Rollback

If critical issues arise:

```bash
npm install daisyui@^2.51.6
```

Then revert CSS and class name changes.

## Resources

- [DaisyUI v5 Changelog](https://daisyui.com/docs/changelog/)
- [DaisyUI Migration Guide](https://daisyui.com/docs/upgrade/)
