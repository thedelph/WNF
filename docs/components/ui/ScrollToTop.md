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

## Implementation Details
- Uses React Router's `useLocation` hook to detect route changes
- Utilizes `useEffect` to perform scrolling when location changes
- Implements smooth scrolling behavior for a better user experience

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
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
};
```

## Best Practices
1. Place the component at the root level of your application
2. Only include one instance of ScrollToTop in your app
3. Make sure it's placed inside your Router component

## Related Components
- None directly, but works in conjunction with any components that use React Router for navigation
