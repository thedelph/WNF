# Dark Mode Feature

**Implemented:** 2026-01-09
**Last Updated:** 2026-01-09

## Overview

WNF supports site-wide dark mode with three theme options:
- **Light**: Always use light theme
- **Dark**: Always use dark theme
- **System** (default): Follow device/OS preference

The theme preference persists across sessions via localStorage.

---

## Theme Architecture

### How It Works

1. **Initial Load**: Flash prevention script in `index.html` runs before React
2. **ThemeContext**: Manages theme state and applies changes
3. **ThemeToggle**: UI component for manual theme switching
4. **Styling**: DaisyUI themes + Tailwind `dark:` utilities

### Technology Integration

| System | Role |
|--------|------|
| DaisyUI | Component theming via `data-theme` attribute |
| Tailwind CSS | Utility-based dark mode via `dark:` prefix |
| localStorage | Preference persistence (key: `wnf-theme`) |
| Media Query | System preference detection |

---

## Core Components

### ThemeContext (`src/context/ThemeContext.tsx`)

Provides theme state management following the AuthContext pattern.

**Interface:**
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}
```

**Usage:**
```typescript
import { useTheme } from '@/context/ThemeContext';

const MyComponent = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className={resolvedTheme === 'dark' ? 'dark-styles' : 'light-styles'}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

**Key Functions:**
- `useTheme()` - Hook to access theme context
- `toggleTheme()` - Cycles between light and dark modes
- `setTheme(theme)` - Explicitly set theme mode

### ThemeToggle (`src/components/ui/ThemeToggle.tsx`)

Sun/Moon toggle button using lucide-react icons.

**Features:**
- Accessible button with `aria-label`
- Smooth hover states
- Icon changes based on current theme
- Consistent sizing with notification bell (h-6 w-6)

**Usage:**
```typescript
import ThemeToggle from '@/components/ui/ThemeToggle';

// In header or navigation
<ThemeToggle />
```

---

## Flash Prevention

An inline script in `index.html` prevents white flash on page load:

```html
<script>
  (function() {
    var theme = localStorage.getItem('wnf-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = theme === 'dark' || (theme !== 'light' && systemDark) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

**Why this matters:**
- Runs synchronously before React loads
- Prevents jarring white → dark transition
- Respects both explicit preference and system setting

---

## Styling Patterns

### Tailwind Dark Mode Classes

Use `dark:` prefix to add dark mode variants:

```typescript
// Basic pattern
className="bg-white dark:bg-gray-800"

// Text colors
className="text-gray-900 dark:text-white"

// Borders
className="border-gray-200 dark:border-gray-700"
```

### Color Mapping Reference

| Light Mode | Dark Mode |
|------------|-----------|
| `bg-white` | `dark:bg-gray-800` |
| `bg-gray-50` | `dark:bg-gray-900` |
| `bg-gray-100` | `dark:bg-gray-800` |
| `bg-blue-50` | `dark:bg-blue-900/20` |
| `text-gray-900` | `dark:text-white` |
| `text-gray-700` | `dark:text-gray-200` |
| `text-gray-600` | `dark:text-gray-300` |
| `text-gray-500` | `dark:text-gray-400` |
| `border-gray-200` | `dark:border-gray-700` |
| `border-gray-300` | `dark:border-gray-600` |

### DaisyUI Semantic Colors

DaisyUI components using semantic colors auto-adapt:
- `bg-base-100`, `bg-base-200`, `bg-base-300` - Background layers
- `text-base-content` - Text color
- `btn-primary`, `btn-secondary` - Button variants

**No dark: prefix needed** for DaisyUI semantic colors.

---

## Configuration

### Tailwind Config (`tailwind.config.js`)

```javascript
module.exports = {
  darkMode: 'class',  // Enable class-based dark mode
  // ...
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark",
  },
};
```

### App Setup (`src/App.tsx`)

ThemeProvider must wrap the app:

```typescript
import { ThemeProvider } from "./context/ThemeContext"

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {/* ... rest of app */}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

## FIFA Theme Exception

FIFA-themed components (leaderboards, player cards) intentionally remain dark in both modes:

- `.fifa-page` class uses `!important` to force dark backgrounds
- Components: `FIFAHeader.tsx`, `FIFAPlayerCard.tsx`, `FIFALeaderboard.tsx`
- These 8 files display identically in light and dark modes

---

## Adding Dark Mode to New Components

### Checklist

When creating new components:

- [ ] Use DaisyUI semantic colors where possible (auto-adapt)
- [ ] Add `dark:` variants for custom colors
- [ ] Test in both light and dark modes
- [ ] Check contrast ratios for accessibility

### Example Component

```typescript
const MyCard: React.FC = ({ title, content }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <h3 className="text-gray-900 dark:text-white font-semibold">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {content}
      </p>
    </div>
  );
};
```

---

## localStorage Schema

**Key:** `wnf-theme`

**Values:**
- `"light"` - Explicit light mode
- `"dark"` - Explicit dark mode
- `null` (not set) - System preference mode

---

## Related Documentation

- [Tech Stack Overview](../TechStackOverview.md) - Technologies used
- [DaisyUI v5 Migration](../fixes/DaisyUIv5Migration.md) - Recent upgrade notes
- [Core Development Patterns](../systems/CoreDevelopmentPatterns.md) - Coding conventions
