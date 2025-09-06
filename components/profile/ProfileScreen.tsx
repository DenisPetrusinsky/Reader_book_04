import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../ui/CustomAlert';
import { supabase } from '../../services/supabase';

export function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  const { showAlert, AlertModal } = useAlert();

    const handleSignOut = async () => {
    try {
      console.log('🔐 Starting sign out process...');
      await signOut();
      console.log('✅ Sign out successful');
      showAlert('Signed Out', 'You have been successfully signed out.');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      showAlert('Error', error.message || 'Failed to sign out');
    }
  };

  const handleResendConfirmation = async () => {
    try {
      console.log('📧 Resending confirmation email...');
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email || '',
      });

      if (error) throw error;
      
      showAlert('Email Sent', 'Confirmation email has been resent. Check your inbox and spam folder.');
    } catch (error: any) {
      console.error('❌ Resend confirmation error:', error);
      showAlert('Error', error.message || 'Failed to resend confirmation email');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your account information</Text>
          </View>

          <Card style={styles.profileCard}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.avatarSection}>
                <Avatar.Icon
                  size={80}
                  icon="account"
                  style={styles.avatar}
                />
                <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <MaterialIcons name="email" size={20} color="#667eea" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Email Address</Text>
                    <Text style={styles.infoValue}>{user?.email || 'Not provided'}</Text>
                    {user?.email && (
                      <View style={styles.emailStatus}>
                        <MaterialIcons 
                          name={user.email_confirmed_at ? "verified" : "warning"} 
                          size={16} 
                          color={user.email_confirmed_at ? "#4CAF50" : "#FF9800"} 
                        />
                        <Text style={[styles.statusText, {
                          color: user.email_confirmed_at ? "#4CAF50" : "#FF9800"
                        }]}>
                          {user.email_confirmed_at ? "Verified" : "Not Verified"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <MaterialIcons name="person" size={20} color="#667eea" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Full Name</Text>
                    <Text style={styles.infoValue}>{user?.full_name || 'Not provided'}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <MaterialIcons name="calendar-today" size={20} color="#667eea" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>
                      {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                    </Text>
                  </View>
                </View>

                {user?.bio && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="info" size={20} color="#667eea" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Bio</Text>
                      <Text style={styles.infoValue}>{user.bio}</Text>
                    </View>
                  </View>
                )}
              </View>

                                          <View style={styles.actionSection}>
                {user?.email && !user.email_confirmed_at && (
                  <Button
                    mode="outlined"
                    onPress={handleResendConfirmation}
                    style={styles.resendButton}
                    contentStyle={styles.buttonContent}
                    icon="email"
                  >
                    Resend Confirmation Email
                  </Button>
                )}

                <Button
                  mode="contained"
                  onPress={() => router.push('/(tabs)/recorder')}
                  style={styles.audioButton}
                  contentStyle={styles.buttonContent}
                  icon="microphone"
                >
                  Record Audio
                </Button>

                <Button
                  mode="contained"
                  onPress={() => router.push('/(tabs)/history')}
                  style={styles.audioButton}
                  contentStyle={styles.buttonContent}
                  icon="history"
                >
                  Recording History
                </Button>

                <Button
                  mode="contained"
                  onPress={handleSignOut}
                  loading={loading}
                  disabled={loading}
                  style={styles.signOutButton}
                  contentStyle={styles.buttonContent}
                  icon="logout"
                >
                  Sign Out
                </Button>
              </View>
            </Card.Content>
          </Card>
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
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  profileCard: {
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardContent: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    backgroundColor: '#667eea',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoText: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  actionSection: {
    alignItems: 'center',
  },
  emailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  resendButton: {
    borderColor: '#FF9800',
    minWidth: 200,
    marginBottom: 12,
  },
  audioButton: {
    backgroundColor: '#667eea',
    minWidth: 200,
    marginBottom: 12,
  },
  signOutButton: {
    backgroundColor: '#e74c3c',
    minWidth: 200,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});