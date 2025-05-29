# PasswordResetModal Component

## Overview
The `PasswordResetModal` component provides a modal interface for resetting or changing passwords. It acts as a container for the password reset functionality, providing a clean, focused UI that overlays the rest of the application when active.

## Component Structure

```tsx
export default function PasswordResetModal({ 
  isOpen, 
  onClose,
  userId
}: PasswordResetModalProps)
```

### Props
- `isOpen`: Boolean indicating whether the modal should be displayed
- `onClose`: Function to call when the modal is closed
- `userId`: The ID of the user whose password is being reset

## Features

### Modal Container
- Creates a focused overlay that dims the rest of the application
- Prevents interaction with elements behind the modal
- Can be dismissed by clicking outside or using the close button

### Animation
- Uses Framer Motion to provide smooth entrance and exit animations
- Enhances user experience with professional transitions

### Integration
- Serves as a container for the actual password change form
- Delegates form handling and validation to child components

## Technical Implementation

### Modal Framework
The component uses a combination of CSS and JavaScript to create a modal overlay:
- Fixed positioning to cover the entire viewport
- Background overlay with reduced opacity
- Z-index management to ensure the modal appears above other content
- Focus trap to maintain accessibility

### Animation Details
Framer Motion animations provide a professional appearance:
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
>
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.9, opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="bg-base-100 rounded-lg shadow-xl max-w-md w-full mx-4"
  >
    {/* Modal content */}
  </motion.div>
</motion.div>
```

### Accessibility
- Manages focus when the modal opens and closes
- Supports keyboard navigation
- Provides clear visual indication of the modal's purpose
- Can be closed with standard patterns (ESC key, close button, clicking overlay)

## Usage Example

```tsx
// In Profile.tsx
import { useState } from 'react'
import PasswordResetModal from '../components/profile/PasswordResetModal'

function Profile() {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const userId = user?.id // From authentication context

  return (
    <>
      {/* Other profile content */}
      
      <button onClick={() => setShowPasswordModal(true)}>
        Change Password
      </button>
      
      <PasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userId={userId}
      />
    </>
  )
}
```

## Integration with Other Components

### Relationship with PasswordChangeSection
The PasswordResetModal typically contains the PasswordChangeSection component, which handles the actual form and validation logic:

```tsx
<PasswordResetModal isOpen={isOpen} onClose={onClose} userId={userId}>
  <PasswordChangeSection
    userId={userId}
    onSuccess={() => {
      // Handle successful password change
      onClose()
    }}
  />
</PasswordResetModal>
```

### Relationship with ProfileHeader
The ProfileHeader component contains buttons that trigger the display of the PasswordResetModal:

```tsx
<ProfileHeader
  profile={profile}
  onPasswordResetClick={() => setShowPasswordModal(true)}
  // Other props
/>

<PasswordResetModal
  isOpen={showPasswordModal}
  onClose={() => setShowPasswordModal(false)}
  userId={userId}
/>
```

## Styling
The component uses Tailwind CSS for styling with:
- Responsive width and padding for different screen sizes
- Proper contrast between the modal and its background
- Clean, minimalist design that focuses attention on the form
- Subtle shadows and rounded corners for a modern appearance

## Best Practices
- The modal does not maintain its own form state, delegating that to child components
- It focuses on presentation and containment rather than business logic
- Animation durations are kept short to avoid frustrating users
- The component is designed to be reusable for different authentication-related tasks
