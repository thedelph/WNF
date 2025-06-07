import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));
      } catch (error) {
        setAuthState(prev => ({
          ...prev,
          error: error as Error,
          loading: false,
        }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));
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
      if (error) throw error;
      return data;
    } catch (error) {
      setAuthState(prev => ({ ...prev, error: error as Error }));
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
      
      // Clear any local storage items if needed
      localStorage.removeItem('supabase.auth.token');
    } catch (error) {
      console.error('Error during sign out:', error);
      setAuthState(prev => ({ ...prev, error: error as Error }));
      
      // Even if there's an error, still reset the local state
      // This ensures the user interface shows logged out state
      setAuthState(prev => ({
        ...prev,
        user: null,
        session: null,
      }));
    }
  };

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    signIn,
    signUp,
    signOut,
  };
};
