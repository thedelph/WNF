import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { sessionRecovery } from '../utils/sessionRecovery';
import { logAuthError } from '../features/auth/utils/authErrorLogger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  isRecovering: boolean;
  sessionHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    isRecovering: false,
    sessionHealth: 'healthy',
  });
  const recoveryAttempted = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  // Helper to determine if error is recoverable
  const isRecoverableError = (error: any): boolean => {
    if (!error) return false;
    const errorMessage = error.message || '';
    const errorCode = error.code || '';

    return (
      errorMessage.includes('refresh_token_not_found') ||
      errorMessage.includes('invalid refresh token') ||
      errorMessage.includes('JWT expired') ||
      errorCode === 'invalid_grant' ||
      errorCode === 'token_expired'
    );
  };

  // Update session health based on error patterns
  const updateSessionHealth = useCallback(() => {
    const isHealthy = sessionRecovery.isSessionHealthy();
    setAuthState(prev => ({
      ...prev,
      sessionHealth: isHealthy ? 'healthy' : prev.error ? 'unhealthy' : 'degraded'
    }));
  }, []);

  useEffect(() => {
    // Get initial session with recovery
    const getInitialSession = async () => {
      try {
        // First, try to get stored session from recovery manager
        const storedSession = await sessionRecovery.getStoredSession();

        if (storedSession) {
          // Validate stored session is still valid
          const { data: { session }, error } = await supabase.auth.getSession();

          if (!error && session) {
            await sessionRecovery.storeSession(session);
            setAuthState(prev => ({
              ...prev,
              session,
              user: session?.user ?? null,
              loading: false,
              sessionHealth: 'healthy',
            }));
            return;
          } else if (error && isRecoverableError(error)) {
            // Attempt recovery
            setAuthState(prev => ({ ...prev, isRecovering: true }));
            const recoveredSession = await sessionRecovery.attemptRecovery();

            if (recoveredSession) {
              setAuthState(prev => ({
                ...prev,
                session: recoveredSession,
                user: recoveredSession?.user ?? null,
                loading: false,
                isRecovering: false,
                sessionHealth: 'healthy',
                error: null,
              }));
              return;
            }
          }
        }

        // Normal session fetch if no stored session or recovery failed
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          await sessionRecovery.storeSession(session);
        }

        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          sessionHealth: session ? 'healthy' : 'healthy',
        }));
      } catch (error) {
        console.error('Session initialization error:', error);

        // One final recovery attempt if we haven't tried yet
        if (!recoveryAttempted.current && isRecoverableError(error)) {
          recoveryAttempted.current = true;
          setAuthState(prev => ({ ...prev, isRecovering: true }));

          const recoveredSession = await sessionRecovery.attemptRecovery();
          if (recoveredSession) {
            setAuthState(prev => ({
              ...prev,
              session: recoveredSession,
              user: recoveredSession?.user ?? null,
              loading: false,
              isRecovering: false,
              sessionHealth: 'healthy',
              error: null,
            }));
            return;
          }
        }

        setAuthState(prev => ({
          ...prev,
          error: error as Error,
          loading: false,
          isRecovering: false,
          sessionHealth: 'unhealthy',
        }));
      }
    };

    getInitialSession();

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        // Store session on successful auth events
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          await sessionRecovery.storeSession(session);
        }

        // Clear session on sign out
        if (event === 'SIGNED_OUT') {
          sessionRecovery.clearSession();
        }

        // Handle session errors
        if (event === 'TOKEN_REFRESH_FAILED' || event === 'USER_DELETED') {
          console.error('Session error event:', event);

          // Attempt recovery for token refresh failures
          if (event === 'TOKEN_REFRESH_FAILED' && !recoveryAttempted.current) {
            recoveryAttempted.current = true;
            setAuthState(prev => ({ ...prev, isRecovering: true }));

            const recoveredSession = await sessionRecovery.attemptRecovery();
            if (recoveredSession) {
              setAuthState(prev => ({
                ...prev,
                session: recoveredSession,
                user: recoveredSession?.user ?? null,
                isRecovering: false,
                sessionHealth: 'healthy',
                error: null,
              }));
              return;
            }
          }

          setAuthState(prev => ({
            ...prev,
            session: null,
            user: null,
            sessionHealth: 'unhealthy',
          }));
          return;
        }

        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          sessionHealth: session ? 'healthy' : prev.sessionHealth,
        }));

        updateSessionHealth();
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if it's a specific error for our problematic users
        const errorMessage = error.message?.toLowerCase() || '';

        // Log diagnostic info for debugging
        if (errorMessage.includes('invalid login credentials') || errorMessage.includes('incorrect')) {
          console.log('Login failed - diagnostics:', {
            email: email.substring(0, 3) + '***', // Partial email for privacy
            errorCode: error.code,
            errorMessage: error.message,
            sessionDiagnostics: sessionRecovery.getSessionDiagnostics(),
            timestamp: new Date().toISOString()
          });

          // Clear any stale session data for fresh start
          sessionRecovery.clearSession();
          localStorage.removeItem('supabase.auth.token');
        }

        throw error;
      }

      // Store successful session
      if (data.session) {
        await sessionRecovery.storeSession(data.session);
        recoveryAttempted.current = false; // Reset recovery flag on successful login
      }

      return data;
    } catch (error: any) {
      // Log login error to database for troubleshooting
      await logAuthError({
        error_type: 'login',
        error_code: error.code ?? error.status?.toString(),
        error_message: error.message || 'Unknown login error',
        user_email: email
      });

      setAuthState(prev => ({
        ...prev,
        error: error as Error,
        sessionHealth: 'unhealthy'
      }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setAuthState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First try to get the current session
      const { data: { session } } = await supabase.auth.getSession();

      // If we have a session, use a more specific signOut approach
      if (session) {
        // Use local scope which only removes the current browser session
        // This avoids the 403 error that can happen with global scope
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
      } else {
        // Handle the case where there's no active session
        // Just reset the local auth state without making the API call
        setAuthState(prev => ({
          ...prev,
          user: null,
          session: null,
        }));
      }

      // Clear all session data
      sessionRecovery.clearSession();
      localStorage.removeItem('supabase.auth.token');
      recoveryAttempted.current = false;

    } catch (error: any) {
      console.error('Error during sign out:', error);

      // Log logout error to database for troubleshooting
      await logAuthError({
        error_type: 'logout',
        error_code: error.code ?? error.status?.toString(),
        error_message: error.message || 'Unknown logout error'
      });

      setAuthState(prev => ({ ...prev, error: error as Error }));

      // Even if there's an error, still reset the local state
      // This ensures the user interface shows logged out state
      setAuthState(prev => ({
        ...prev,
        user: null,
        session: null,
      }));

      // Clear session data even on error
      sessionRecovery.clearSession();
      localStorage.removeItem('supabase.auth.token');
    }
  };

  // Manual session recovery function (can be called from UI)
  const recoverSession = async () => {
    setAuthState(prev => ({ ...prev, isRecovering: true, error: null }));

    try {
      const recoveredSession = await sessionRecovery.attemptRecovery();

      if (recoveredSession) {
        setAuthState(prev => ({
          ...prev,
          session: recoveredSession,
          user: recoveredSession?.user ?? null,
          isRecovering: false,
          sessionHealth: 'healthy',
          error: null,
        }));
        return true;
      }

      return false;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isRecovering: false,
        error: error as Error,
        sessionHealth: 'unhealthy',
      }));
      return false;
    }
  };

  // Get session diagnostics (for debugging)
  const getSessionDiagnostics = () => {
    return sessionRecovery.getSessionDiagnostics();
  };

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    isRecovering: authState.isRecovering,
    sessionHealth: authState.sessionHealth,
    signIn,
    signUp,
    signOut,
    recoverSession,
    getSessionDiagnostics,
  };
};
