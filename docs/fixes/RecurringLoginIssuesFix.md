# Recurring Login Issues Fix

**Last Updated:** December 19, 2025

## Problem
Multiple users (Dom, Anthony B) repeatedly experience login failures with errors including:
- "Username or password is incorrect"
- JWT parsing errors: "token is malformed: token contains an invalid number of segments"
- "Failed to send magic link/password reset" (500 errors)
- TypeError: `ge.warning is not a function`
- 403 Forbidden errors on logout/session clearing

## Root Cause Analysis

### Primary Issues Identified

1. **Session Token Corruption** (Original Issue)
   - Existing sessions become invalid after deployments
   - Refresh tokens stored in browser may not properly refresh
   - Supabase auth state becomes corrupted for specific users

2. **Service Role Key JWT Interference** (November 17, 2025 Discovery) ⚠️ **CRITICAL**
   - The `supabaseAdmin` client was initialized correctly with service role key
   - However, when making API calls, the Supabase client was **using the logged-in user's JWT token** instead of the service role key
   - This caused 403 "malformed JWT" errors when trying to clear sessions
   - **Solution:** Bypass Supabase client entirely and use direct fetch calls with explicit Authorization headers

3. **SMTP Authentication Failure** (November 17, 2025 Discovery → **RESOLVED December 19, 2025**)
   - ~~Supabase's default SMTP service returns error: `535 5.7.8 Error: authentication failed`~~
   - **FIXED:** Configured Resend as custom SMTP provider
   - All email-based recovery methods now work:
     - ✅ Magic links
     - ✅ Password reset emails
     - ✅ Email verification
   - **Root Cause:** Gandi mailbox (noreply@wnf.app) expired October 2025
   - **Solution:** Switched to Resend (`smtp.resend.com`) - see December 19, 2025 update below

## Solution Implemented

### 1. Updated Supabase Dependencies
- Upgraded from `@supabase/supabase-js: ^2.46.1` to `^2.57.4`
- Includes numerous bug fixes for session management

### 2. Session Recovery System (`/src/utils/sessionRecovery.ts`)
- **Versioned Token Storage**: Detects and clears stale tokens from previous deployments
- **Deployment Detection**: Tracks deployment changes and automatically attempts recovery
- **Automatic Recovery**: Implements exponential backoff retry mechanism
- **Session Health Monitoring**: Tracks authentication failures and success patterns

### 3. Enhanced Authentication Hook (`/src/hooks/useAuth.ts`)
- **Recoverable Error Detection**: Identifies JWT expiration and refresh token issues
- **Session Health States**: `healthy`, `degraded`, `unhealthy`
- **Automatic Recovery Attempts**: Tries to restore sessions on initialization
- **Diagnostic Logging**: Enhanced logging for problematic users

### 4. Improved Login Experience (`/src/pages/Login.tsx`)
- **Session Recovery Banner**: Visual feedback for session issues
- **Magic Link Fallback**: Alternative authentication method for affected users
- **Enhanced Error Messages**: Specific guidance for recurring issues
- **Session Diagnostics**: Debug information for troubleshooting

### 5. Admin Diagnostic Tools (`/src/pages/admin/SessionDiagnostics.tsx`)
- **User Search**: Find users by email using Admin API (not table queries)
- **Magic Link Generation**: Send magic links directly to affected users (requires working SMTP)
- **Password Reset**: Force password reset with fresh tokens (requires working SMTP)
- **Session Clearing**: Clear all sessions using **direct fetch with service role key** (November 17, 2025 fix)
- **Set Temp Password**: ✨ NEW - Bypass email entirely by setting password directly (November 17, 2025)
- **Session Health Status**: Visual indicators for user session health
- **Create Player Record**: Create missing player records for auth users

### 6. Service Role Key Fixes (November 17, 2025)

#### Session Clearing Fix (`clearUserSessions()`)
**Problem:** `supabaseAdmin.auth.admin.signOut()` was returning 403 errors with "malformed JWT" despite service role key being configured correctly.

**Root Cause:** The Supabase client was sending the logged-in user's JWT token instead of the service role key in the Authorization header.

**Solution:** Use direct fetch API calls with explicit service role key:
```typescript
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey,
    'Content-Type': 'application/json'
  }
})
```

**Files Changed:**
- `src/pages/admin/SessionDiagnostics.tsx` - Lines 445-503

#### Set Temporary Password Feature (`setTemporaryPassword()`)
**Problem:** SMTP authentication failure prevents sending magic links or password resets.

**Solution:** Directly set user password via Admin API, bypassing email entirely:
```typescript
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: tempPassword,
    email_confirm: true  // Skip email verification
  })
})
```

**Features:**
- Generates random password (format: `WNF` + random chars + `!`)
- Auto-copies to clipboard
- Shows alert with password for manual copying
- Password can be sent via WhatsApp/text instead of email

**Files Changed:**
- `src/pages/admin/SessionDiagnostics.tsx` - Lines 372-469, 796-804, 817-834

#### Supabase Admin Client Configuration Fix
**Problem:** `supabaseAdmin` was configured with `autoRefreshToken: true`, which is incorrect for admin clients.

**Solution:** Changed to `autoRefreshToken: false` in `src/utils/supabase.ts`:
```typescript
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,  // Admin clients shouldn't refresh tokens
      persistSession: false,
      detectSessionInUrl: false
    }
  }
)
```

**Files Changed:**
- `src/utils/supabase.ts` - Line 51

### 7. Toast Library Compatibility Fixes (November 17, 2025)

**Problem:** TypeError: `ge.warning is not a function` when using `toast.warning()`

**Root Cause:** Project uses `react-hot-toast` which doesn't have a `.warning()` method (only `react-toastify` has this).

**Solution:** Replace all `toast.warning()` calls with:
```typescript
toast('Warning message here', {
  icon: '⚠️',
  duration: 4000
})
```

**Files Changed:**
- `src/pages/admin/SessionDiagnostics.tsx` - Lines 88, 133
- `src/components/admin/games/GameRegistrations.tsx` - Lines 305-319

## How to Use

### For Users Experiencing Issues

1. **Clear Browser Data** (first attempt):
   - Clear cookies and localStorage for your app domain
   - Try logging in again

2. **Use Magic Link** (if password fails):
   - On the login page, if you see the "Alternative Login Method" section
   - Click "Send Magic Link to Email"
   - Check your email and click the link

3. **Request Password Reset**:
   - Click "Forgot Password" on the login page
   - This will clear any corrupted auth data

### For Administrators

**✅ UPDATE (December 19, 2025):** SMTP now working via Resend. All email-based methods are functional.

1. **Access Session Diagnostics**:
   - Go to Admin Portal → Session Diagnostics
   - Search for the affected user by email

2. **Set Temporary Password** (✨ NEW - recommended when SMTP is broken):
   - Click "Set Temp Password" button
   - Password is auto-copied to clipboard and shown in alert
   - Paste and send to user via WhatsApp or text
   - User logs in with temporary password
   - User should change password immediately after login (Profile → Change Password)
   - **Bypasses email entirely - works even when SMTP is broken**

3. **Send Magic Link** ✅:
   - Click "Send Magic Link" button
   - User receives email with one-click login
   - ✅ Working (December 2025 - Resend SMTP configured)

4. **Force Password Reset** ✅:
   - Click "Reset Password" button
   - User receives password reset email
   - ✅ Working (December 2025 - Resend SMTP configured)

5. **Clear All Sessions** (super admin only):
   - Available to super admins only
   - Forces user to re-authenticate on all devices
   - Now uses direct fetch with service role key (fixed November 17, 2025)

### Identifying Problem Users

To identify which users are experiencing issues:

1. Check Supabase Auth logs for repeated failed login attempts
2. Look for patterns in the session diagnostics:
   - Users with `sessionHealth: 'unhealthy'`
   - High `failureCount` in session health data
   - Last successful auth > 1 hour ago with recent attempts

3. Add their emails to the `problemUserEmails` array in `/src/pages/Login.tsx`:
```typescript
const problemUserEmails = [
  'user1@example.com',
  'user2@example.com'
]
```

## Fixing SMTP Authentication (Long-term Solution)

**Current Status:** SMTP authentication is failing with error `535 5.7.8 Error: authentication failed`

### Configure Custom SMTP (Recommended)

1. **Access Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to **Authentication** → **Email Templates** → **SMTP Settings**

2. **Choose SMTP Provider** (options):
   - **Gmail**: Use app-specific password
   - **SendGrid**: Free tier allows 100 emails/day
   - **AWS SES**: Production-ready, pay-as-you-go
   - **Mailgun**: Developer-friendly
   - **Postmark**: High deliverability

3. **Configure SMTP Settings**:
   ```
   Host: smtp.example.com
   Port: 587 (or 465 for SSL)
   Username: your-smtp-username
   Password: your-smtp-password
   Sender Email: noreply@yourdomain.com
   Sender Name: WNF
   ```

4. **Test Configuration**:
   - Send a test email from Supabase dashboard
   - If successful, magic links and password resets will work
   - If failed, check logs for specific error

### Alternative: Use "Set Temp Password" (Current Workaround)

Until SMTP is configured, admins can use the "Set Temp Password" feature which bypasses email entirely by setting passwords directly via the Admin API.

## Prevention

### For Future Deployments

1. **Monitor Auth Logs**: Check Supabase auth logs after deployment using:
   ```typescript
   mcp__supabase__get_logs({ service: 'auth' })
   ```
2. **Test with Problem Users**: Have affected users test login immediately after deployment
3. **Use Set Temp Password Proactively**: Set temporary passwords for known problem users before they report issues
4. **Verify Service Role Key**: Ensure `VITE_SUPABASE_SERVICE_ROLE_KEY` is configured in production

### Long-term Solutions

1. **Session Migration**: The recovery system now handles deployment transitions
2. **Token Versioning**: Prevents old tokens from causing issues
3. **Health Monitoring**: Tracks and reports session health metrics
4. **Custom SMTP**: Configure reliable SMTP to restore email-based recovery methods
5. **Direct API Calls**: Use direct fetch with service role key for admin operations (avoids JWT interference)

## Technical Details

### Session Storage Structure
```typescript
{
  version: "1.0.0",        // Token version for compatibility
  session: Session,        // Supabase session object
  timestamp: number,       // When session was stored
  deploymentId: string     // Unique deployment identifier
}
```

### Recovery Flow
1. Check stored session version and deployment ID
2. If mismatch detected, attempt refresh with old token
3. If refresh fails, try automatic recovery with backoff
4. Clear session and require fresh login if all recovery fails

### Session Health Metrics
- Tracks consecutive failures
- Records last successful authentication
- Monitors time since last successful auth
- Provides diagnostic data for troubleshooting

### Service Role Key vs User JWT Issue (November 17, 2025)

**The Problem:**
Even when `supabaseAdmin` is correctly initialized with the service role key:
```typescript
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {...})
```

The Supabase client library may still send the **logged-in user's JWT token** in the Authorization header instead of the service role key. This happens because:

1. The browser has an active user session
2. Supabase client auto-detects the session from localStorage
3. When making API calls, it uses the user's JWT instead of the service role key
4. This causes 403 "malformed JWT" errors on admin endpoints

**The Solution:**
Bypass the Supabase client and use direct fetch calls:
```typescript
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,  // Explicit service role key
    'apikey': serviceRoleKey,                      // Also set as apikey
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
})
```

This ensures the service role key is **always** used, regardless of the logged-in user's session state.

**Affected Operations:**
- ✅ Session clearing (fixed)
- ✅ Setting temporary passwords (fixed)
- ⚠️ Any future admin operations should use direct fetch, not `supabaseAdmin` client

## Monitoring

The system now provides several monitoring points:

1. **Console Logs**: Enhanced logging for auth issues (search for "Login failed - diagnostics")
2. **Session Health Data**: Stored in localStorage as `wnf_session_health`
3. **Admin Dashboard**: Session Diagnostics tool shows user session status
4. **User Feedback**: Recovery banner shows session health status
5. **Supabase Auth Logs** (November 17, 2025): Monitor via MCP:
   ```typescript
   mcp__supabase__get_logs({ service: 'auth' })
   ```
   Look for:
   - `535 5.7.8` errors (SMTP authentication failure)
   - `403` errors (service role key issues)
   - `500` errors (general failures)
6. **Service Role Key Validation** (November 17, 2025):
   - Check browser console for: "✅ Service role key loaded"
   - Call `window.debugSupabaseAdmin()` in console to verify key configuration

## Rollback Plan

If the solution causes issues:

1. Revert the package.json changes
2. Remove the sessionRecovery.ts file
3. Revert useAuth.ts to previous version
4. The system will fall back to default Supabase auth behavior

## Future Improvements

1. **Automated Alerts**: Send alerts when multiple users experience auth issues
2. **Session Analytics**: Track session health metrics over time
3. **Proactive Recovery**: Detect deployment and pre-emptively refresh sessions
4. **User Communication**: ~~Automated emails to affected users during issues~~ **Use WhatsApp/SMS instead until SMTP is fixed**
5. **Custom SMTP Configuration** (PRIORITY): Configure reliable SMTP provider to restore email-based recovery
6. **Admin API Audit**: Review all uses of `supabaseAdmin` client and replace with direct fetch where needed
7. **Service Role Key Monitoring**: Automated checks to ensure service role key is properly configured
8. **SMTP Health Checks**: Regular monitoring of SMTP authentication status

## Known Issues

### All Critical Issues Resolved ✅

### Resolved (December 19, 2025)
- ✅ **SMTP Authentication Failure**: Fixed by switching to Resend SMTP
  - Magic links and password reset emails now work
  - Provider: Resend (`smtp.resend.com`)
  - Root cause: Gandi mailbox (noreply@wnf.app) expired October 2025

### Resolved (November 17, 2025)
- ✅ **Service Role Key JWT Interference**: Fixed by using direct fetch calls
- ✅ **Toast Library Compatibility**: Fixed by using correct toast API
- ✅ **Session Clearing 403 Errors**: Fixed by bypassing Supabase client
- ✅ **Merge Conflict in GameCard.tsx**: Fixed

## Summary of December 19, 2025 Session

**Issue:** User registration failing with "Error sending confirmation email"

**Root Cause:** Gandi mailbox (noreply@wnf.app) expired October 2025, causing SMTP authentication to fail

**Solution Implemented:**
1. Switched from Gandi SMTP to Resend (`smtp.resend.com`)
2. Added DNS records (DKIM, SPF, MX) for wnf.app domain
3. Configured Supabase SMTP settings with Resend credentials
4. Added `auth_error_logs` table for future troubleshooting
5. Added auth error logging to signup/login/logout flows

**Current Status (All Working):**
- ✅ User registration with email confirmation
- ✅ Magic links
- ✅ Password reset emails
- ✅ Session clearing
- ✅ Set temp password (backup method)

**New Features Added:**
- `auth_error_logs` table in Supabase for tracking auth failures
- `logAuthError()` utility in `src/features/auth/utils/authErrorLogger.ts`
- Error logging integrated into `useRegistration.ts` and `useAuth.ts`

---

## Summary of November 17, 2025 Session

**Problem Users:** Dom (toffeetower@hotmail.com), Anthony B

**Issues Fixed:**
1. Session clearing now works (direct fetch with service role key)
2. Added "Set Temp Password" feature to bypass broken SMTP
3. Fixed toast.warning() TypeErrors
4. Fixed merge conflict in GameCard.tsx
5. Changed supabaseAdmin autoRefreshToken to false

**Root Causes Identified:**
1. Supabase client using user JWT instead of service role key
2. SMTP authentication broken (535 5.7.8 error) - **FIXED December 19, 2025**
3. Wrong toast library method being used