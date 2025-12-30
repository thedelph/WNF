# Auth Error Logging

**Last Updated:** December 19, 2025

## Overview

Auth error logging captures authentication failures (signup, login, logout, password reset) to a database table for troubleshooting. This helps administrators diagnose issues when users report problems.

## Database Table

### `auth_error_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMPTZ | When the error occurred |
| `error_type` | TEXT | `signup`, `login`, `password_reset`, `logout` |
| `error_code` | TEXT | Supabase error code (e.g., `23505`, `invalid_credentials`) |
| `error_message` | TEXT | Full error message |
| `user_email` | TEXT | Email attempted (for debugging) |
| `user_agent` | TEXT | Browser/device info |
| `metadata` | JSONB | Additional context (e.g., friendly_name for signup) |

### Indexes
- `idx_auth_error_logs_created_at` - For querying recent errors
- `idx_auth_error_logs_error_type` - For filtering by error type

### RLS Policies
- **Admins can view**: Only users with `is_admin = true` can SELECT
- **Anyone can insert**: Both authenticated and anonymous users can INSERT (needed for signup errors before auth)

## Usage

### Viewing Logs

**Supabase Dashboard:**
1. Go to Table Editor → `auth_error_logs`
2. Sort by `created_at` DESC to see recent errors

**SQL Query:**
```sql
SELECT * FROM auth_error_logs
ORDER BY created_at DESC
LIMIT 50;
```

**Filter by error type:**
```sql
SELECT * FROM auth_error_logs
WHERE error_type = 'signup'
ORDER BY created_at DESC;
```

**Filter by email:**
```sql
SELECT * FROM auth_error_logs
WHERE user_email = 'user@example.com'
ORDER BY created_at DESC;
```

### Code Integration

The `logAuthError()` function is available for logging auth errors:

```typescript
import { logAuthError } from '@/features/auth/utils/authErrorLogger'

// In a catch block
try {
  // auth operation
} catch (error) {
  await logAuthError({
    error_type: 'signup',  // or 'login', 'logout', 'password_reset'
    error_code: error.code,
    error_message: error.message,
    user_email: email,
    metadata: { additionalContext: 'value' }
  })
}
```

**Note:** `logAuthError()` is non-blocking and will not throw errors. If logging fails, it logs to console but doesn't disrupt the user flow.

## Files

| File | Purpose |
|------|---------|
| `src/features/auth/utils/authErrorLogger.ts` | Logger utility |
| `src/features/auth/hooks/useRegistration.ts` | Logs signup errors |
| `src/hooks/useAuth.ts` | Logs login/logout errors |

## Common Error Patterns

| Error Message | Likely Cause |
|---------------|--------------|
| `Error sending confirmation email` | SMTP configuration issue |
| `invalid login credentials` | Wrong password or unconfirmed email |
| `User already registered` | Duplicate signup attempt |
| `23505` (unique violation) | Duplicate friendly name |
| `JWT expired` | Session timeout |

## Related Documentation

- [Recurring Login Issues Fix](/docs/fixes/RecurringLoginIssuesFix.md) - Auth troubleshooting guide
- [CLAUDE.md - SMTP Section](/CLAUDE.md) - Current SMTP status
