# Password Change Feature

## Overview
The Password Change feature allows users to change their account password directly from their profile page. This self-service capability enhances security by enabling users to regularly update their credentials without requiring administrator intervention.

## Component Structure
The password change functionality is implemented through several interconnected components:

1. **ProfileHeader Component** - Contains the "CHANGE PASSWORD" button that triggers the password change flow
2. **PasswordResetModal Component** - Displays the modal for password change interaction
3. **PasswordChangeSection Component** - Manages the password change form and validation
4. **Profile Page** - Coordinates the overall flow and handles state management

## User Flow
1. User navigates to their profile page
2. User clicks on the "CHANGE PASSWORD" button (desktop: top-right corner, mobile: below username)
3. The password change section appears with form fields
4. User enters their current password and new password (with confirmation)
5. System validates the entries and processes the password change
6. User receives confirmation of successful password change

## Technical Implementation

### ProfileHeader Component
The ProfileHeader component displays the "CHANGE PASSWORD" button in two locations:
- On desktop: Positioned in the top-right corner of the profile header
- On mobile: Displayed centrally below the player's name

The button is styled differently based on the viewport size for optimal user experience. It includes an icon and text, both with responsive sizing.

```tsx
// Desktop button (visible only on sm and larger screens)
<div className="hidden sm:block absolute top-4 right-4">
  <Tooltip content="Change your password">
    <button 
      onClick={onPasswordResetClick}
      className="btn btn-outline btn-xs h-8 px-2"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg className="h-3.5 w-3.5 mr-1.5" /* ... */ />
      <span>CHANGE PASSWORD</span>
    </button>
  </Tooltip>
</div>

// Mobile button (visible only on screens smaller than sm)
<div className="sm:hidden mt-2 flex justify-center">
  <Tooltip content="Change your password">
    <button 
      onClick={onPasswordResetClick}
      className="btn btn-outline btn-xs gap-1 px-2"
      style={{ height: '26px', display: 'inline-flex', alignItems: 'center' }}
    >
      <svg className="h-3 w-3 mr-1" /* ... */ />
      <span>CHANGE PASSWORD</span>
    </button>
  </Tooltip>
</div>
```

### PasswordChangeSection Component
The PasswordChangeSection component handles:
- Form rendering with password input fields
- Client-side validation of password requirements
- Submission of password change requests
- Display of success/error messages
- Smooth animations using Framer Motion

### Profile Page Integration
The Profile page manages the state for showing/hiding the password change section and handles the overall flow coordination. It uses Framer Motion's AnimatePresence to provide smooth enter/exit animations.

```tsx
// Animation setup in Profile.tsx
<AnimatePresence mode="wait">
  {showPasswordReset && (
    <PasswordChangeSection 
      onClose={() => setShowPasswordReset(false)} 
    />
  )}
</AnimatePresence>
```

## Styling and Accessibility

### Responsive Design
- The "CHANGE PASSWORD" button is appropriately sized and positioned for both desktop and mobile viewports
- On mobile, the button appears below the player's name for easier touchscreen access
- On desktop, the button is positioned in the top-right corner following standard UI patterns

### Visual Feedback
- The button includes a tooltip to clarify its purpose
- The button has hover states for better user feedback
- The password change form includes validation messages

### Animations
- Framer Motion provides smooth animations when the password change section appears and disappears
- The animations enhance the user experience without hindering usability

## Security Considerations
- Current password verification ensures only the account owner can change passwords
- Password strength requirements help users create secure passwords
- All password operations use secure connections (HTTPS)
- No password information is stored in client-side state beyond the current session

## Future Enhancements
Potential improvements for future iterations:
- Password strength meter
- Two-factor authentication integration
- Email confirmation of password changes
- Password history to prevent reuse of recent passwords

## Related Components
- `ProfileHeader.tsx` - Contains the change password button
- `PasswordResetModal.tsx` - Manages the modal display
- `PasswordChangeSection.tsx` - Handles the form and validation
- `Profile.tsx` - Coordinates the overall password change flow
