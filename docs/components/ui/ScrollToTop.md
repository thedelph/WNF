# ScrollToTop Component

## Overview
The `ScrollToTop` component is a utility component that automatically scrolls the window to the top when the route changes in the application. This ensures a consistent user experience by always starting new pages from the top.

## Usage

```tsx
import { ScrollToTop } from './components/ui/ScrollToTop';

// Place in your app's root component
const App = () => {
  return (
    <>
      <ScrollToTop />
      {/* Your app content */}
    </>
  );
};
```

## Features
- Automatically scrolls to top on route changes
- Uses smooth scrolling for better user experience
- Zero visual footprint (renders nothing)
- Works with React Router's location system
- Supports deep linking to specific sections (e.g., changelog entries with hash fragments)

## Implementation Details
- Uses React Router's `useLocation` hook to detect route changes
- Utilizes `useEffect` to perform scrolling when location changes
- Implements smooth scrolling behavior for a better user experience
- Preserves hash fragments in URLs to allow deep linking to specific sections
- Works seamlessly with changelog entries that use hash-based navigation

## Technical Details

### Props
None. The component is self-contained and requires no props.

### Dependencies
- React
- React Router DOM (`useLocation` hook)

### Example Implementation
```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash in the URL, let the browser handle scrolling to it
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Otherwise, scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname, hash]);

  return null;
};
```

## Best Practices
1. Place the component at the root level of your application
2. Only include one instance of ScrollToTop in your app
3. Make sure it's placed inside your Router component
4. When creating deep links, use hash fragments (e.g., `/changelog#v1-2-0`) for smooth scrolling to specific sections

## Use Cases
- General page navigation - scrolls to top when changing routes
- Changelog deep linking - preserves and scrolls to specific version entries when accessing URLs like `/changelog#v1-2-0`
- Any component that needs to link to a specific section of a page using hash fragments

## Related Components
- Changelog component - uses hash-based navigation for version entries
- Any components that use React Router for navigation with hash fragments
