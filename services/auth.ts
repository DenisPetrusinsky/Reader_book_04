import { supabase } from './supabase';
import { SignInData, SignUpData, ProfileUpdateData, User } from '../types/auth';

export const authService = {
  async signUp(data: SignUpData) {
    console.log('🔐 Starting sign up process for:', data.email);
    
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
        },
      },
    });

    if (error) {
      console.error('❌ Sign up error:', error.message);
      throw error;
    }

    console.log('✅ Sign up successful:', authData.user?.email);
    return authData;
  },

    async signIn(data: SignInData) {
    console.log('🔐 Starting sign in process for:', data.email);
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      console.error('❌ Sign in error:', error.message);
      throw error;
    }

    // Check if email is confirmed
    if (authData.user && !authData.user.email_confirmed_at) {
      console.log('⚠️ Email not confirmed for user:', data.email);
      // Don't throw error, just return data - let the component handle it
    }

    console.log('✅ Sign in successful:', authData.user?.email);
    console.log('📧 Email confirmed:', !!authData.user?.email_confirmed_at);
    return authData;
  },

  async signOut() {
    console.log('🔐 Starting sign out process');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Sign out error:', error.message);
      throw error;
    }

    console.log('✅ Sign out successful');
  },

  async getProfile(userId: string): Promise<User | null> {
    console.log('👤 Fetching profile for user:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Get profile error:', error.message);
      return null;
    }

    console.log('✅ Profile fetched successfully');
    return data;
  },

  async updateProfile(userId: string, updates: ProfileUpdateData) {
    console.log('👤 Updating profile for user:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Update profile error:', error.message);
      throw error;
    }

    console.log('✅ Profile updated successfully');
    return data;
  },

  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Get session error:', error.message);
      return null;
    }

    return session;
  },
};