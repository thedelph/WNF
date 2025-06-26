# Changelog Component

## Overview
The Changelog component displays version history and updates for the WNF application. It features an organised list of releases with deep linking support for sharing specific version updates.

## Features
- Displays version releases in reverse chronological order (newest first)
- Each version entry includes:
  - Version number with visual badge
  - Release date
  - List of changes categorised by type (Added, Changed, Fixed, etc.)
- Deep linking support - each version has a unique URL hash
- Smooth scrolling to specific versions when accessed via direct link
- Responsive design that works well on all screen sizes

## Deep Linking
The changelog supports deep linking to specific versions using URL hash fragments:
- Format: `/changelog#v{version}` (e.g., `/changelog#v1-2-0`)
- When accessing a deep link, the page automatically scrolls to the specified version
- Useful for sharing specific updates with users or referencing changes in documentation

## Usage
```tsx
import { Changelog } from './components/Changelog';

// The component is typically used in the ChangelogPage
const ChangelogPage = () => {
  return (
    <div className="container mx-auto">
      <Changelog />
    </div>
  );
};
```

## Implementation Details
- Version entries are stored in a structured format with metadata
- Each version is assigned a unique ID based on its version number
- The component uses React Router's hash navigation for deep linking
- Integrates with the ScrollToTop component for smooth scrolling behaviour

## Styling
- Uses Daisy UI components for consistent theming
- Version badges use the 'badge-primary' class
- Change types are visually differentiated with icons or labels
- Responsive padding and spacing for optimal readability

## Best Practices
1. Keep version numbers consistent with semantic versioning (e.g., 1.2.0)
2. Group changes by type (Added, Changed, Fixed, Removed)
3. Write clear, user-friendly descriptions of changes
4. Include dates for each release
5. Use deep links when referencing specific versions in other documentation

## Related Components
- ScrollToTop - Handles the smooth scrolling behaviour for deep links
- Navigation components - May include links to the changelog page