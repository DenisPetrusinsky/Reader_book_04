import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { authService } from '../services/auth';
import { AuthState, SignInData, SignUpData, User } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (data: SignInData) => Promise<any>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendConfirmationToAll: () => Promise<number | undefined>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  const fetchUserProfile = async (userId: string) => {
    try {
      const profile = await authService.getProfile(userId);
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const signIn = async (data: SignInData) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await authService.signIn(data);
      if (result.user) {
        const profile = await fetchUserProfile(result.user.id);
        setState(prev => ({
          ...prev,
          user: profile,
          session: result.session,
          loading: false,
        }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const signUp = async (data: SignUpData) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await authService.signUp(data);
      if (result.user) {
        // Profile will be created automatically by database trigger
        setTimeout(async () => {
          const profile = await fetchUserProfile(result.user!.id);
          setState(prev => ({
            ...prev,
            user: profile,
            session: result.session,
            loading: false,
          }));
        }, 1000); // Small delay for trigger to complete
      }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await authService.signOut();
      setState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

    const refreshProfile = async () => {
    if (state.session?.user) {
      const profile = await fetchUserProfile(state.session.user.id);
      setState(prev => ({ ...prev, user: profile }));
    }
  };

  const resendConfirmationToAll = async () => {
    try {
      console.log('📧 Starting bulk email confirmation resend...');
      
      // Get all users with unconfirmed emails
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id')
        .is('email_confirmed_at', null);

      if (error) {
        console.error('❌ Error fetching unconfirmed users:', error);
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.log('✅ No unconfirmed users found');
        return;
      }

      console.log(`📧 Found ${profiles.length} unconfirmed users, resending emails...`);

      // This would require admin/service role access
      // For now, we'll just log the count
      console.log('📊 Unconfirmed users count:', profiles.length);
      
      return profiles.length;
    } catch (error) {
      console.error('❌ Error in bulk resend:', error);
      throw error;
    }
  };

  // Initialize auth state
    useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('🔄 Starting auth initialization...');
      try {
        const session = await authService.getCurrentSession();
        console.log('📋 Current session:', session?.user?.email || 'none');
        
        if (isMounted) {
          if (session?.user) {
            console.log('👤 Found user, fetching profile...');
            const profile = await fetchUserProfile(session.user.id);
            console.log('📊 Profile loaded:', profile?.full_name || 'no name');
            setState({
              user: profile,
              session,
              loading: false,
              initialized: true,
            });
          } else {
            console.log('❌ No user session found');
            setState({
              user: null,
              session: null,
              loading: false,
              initialized: true,
            });
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (isMounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          });
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

    // Listen to auth changes
  useEffect(() => {
    console.log('🎧 Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in, fetching profile...');
        const profile = await fetchUserProfile(session.user.id);
        setState(prev => ({
          ...prev,
          user: profile,
          session,
          loading: false,
          initialized: true,
        }));
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
        });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 Token refreshed');
        setState(prev => ({
          ...prev,
          session,
        }));
      }
    });

    return () => {
      console.log('🛑 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    resendConfirmationToAll,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}