import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../ui/CustomAlert';

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, loading } = useAuth();
  const { showAlert, AlertModal } = useAlert();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp && !formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

    const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (isSignUp) {
        console.log('📝 Starting sign up process...');
        await signUp({
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
        });
        showAlert(
          'Account Created Successfully!', 
          'Please check your email and click the confirmation link to activate your account. Check your spam folder if you do not see the email.'
        );
      } else {
        console.log('🔐 Starting sign in process...');
        const result = await signIn({
          email: formData.email.trim(),
          password: formData.password,
        });
        
        // Check if email is confirmed
        if (result?.user && !result.user.email_confirmed_at) {
          showAlert(
            'Email Not Confirmed',
            'Please check your email and click the confirmation link before signing in. Would you like us to resend the confirmation email?'
          );
          return;
        }
        
        showAlert('Welcome Back', `Hello! You have successfully signed in.`);
      }
    } catch (error: any) {
      console.error('❌ Authentication error:', error);
      
      let errorMessage = error.message || 'An error occurred during authentication';
      
      // Handle specific error cases
      if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before signing in. Check your inbox and spam folder.';
      } else if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email rate limit exceeded')) {
        errorMessage = 'Too many emails sent. Please wait a few minutes before requesting another confirmation email.';
      }
      
      showAlert('Authentication Error', errorMessage);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ email: '', password: '', full_name: '' });
    setErrors({});
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Sign up to get started with AuthApp' 
                : 'Sign in to continue to your account'
              }
            </Text>

            <View style={styles.form}>
              {isSignUp && (
                <>
                  <TextInput
                    label="Full Name"
                    value={formData.full_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
                    mode="outlined"
                    style={styles.input}
                    error={!!errors.full_name}
                    disabled={loading}
                  />
                  <HelperText type="error" visible={!!errors.full_name}>
                    {errors.full_name}
                  </HelperText>
                </>
              )}

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                error={!!errors.email}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>

              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                error={!!errors.password}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>

              <Button
                mode="text"
                onPress={toggleAuthMode}
                disabled={loading}
                style={styles.toggleButton}
                textColor="#ffffff"
              >
                {isSignUp 
                  ? 'Already have an account? Sign In' 
                  : 'Need an account? Sign Up'
                }
              </Button>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <AlertModal />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    gap: 4,
  },
  input: {
    backgroundColor: 'white',
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#667eea',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  toggleButton: {
    marginTop: 16,
  },
});