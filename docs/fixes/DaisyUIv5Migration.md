# DaisyUI v5 Migration

**Last Updated:** January 7, 2026
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
- [ ] Main dashboard
- [ ] Admin portal (games, players, tokens)
- [ ] Team balancing pages
- [ ] Profile pages
- [ ] Game registration
- [ ] Modals and dropdowns
- [ ] Forms and inputs
- [ ] Tables and cards
- [ ] Mobile responsiveness

## Rollback

If critical issues arise:

```bash
npm install daisyui@^2.51.6
```

Then revert CSS and class name changes.

## Resources

- [DaisyUI v5 Changelog](https://daisyui.com/docs/changelog/)
- [DaisyUI Migration Guide](https://daisyui.com/docs/upgrade/)
