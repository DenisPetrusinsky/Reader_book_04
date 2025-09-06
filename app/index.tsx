import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AuthForm } from '../components/auth/AuthForm';

export default function App() {
  const { user, loading, initialized } = useAuth();

  console.log('🔍 App Index - Auth State:', { 
    user: user?.email || 'none', 
    loading, 
    initialized 
  });

  // Show loading screen during initialization
  if (!initialized) {
    console.log('⏳ App not initialized yet, showing loading');
    return <LoadingScreen />;
  }

  if (loading) {
    console.log('⏳ Auth loading, showing loading screen');
    return <LoadingScreen />;
  }

  // Show auth form if not signed in
  if (!user) {
    console.log('👤 No user found, showing auth form');
    return <AuthForm />;
  }

  // Redirect authenticated users to tabs
  console.log('✅ User authenticated, redirecting to tabs');
  return <Redirect href="/(tabs)" />;
}