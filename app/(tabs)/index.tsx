import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { ProfileScreen } from '../../components/profile/ProfileScreen';
import { ParentDashboard } from '../../components/dashboard/ParentDashboard';
import { StudentProgress } from '../../components/dashboard/StudentProgress';

export default function DashboardTab() {
  const { user } = useAuth();

  if (!user) {
    return <ProfileScreen />;
  }

  if (user.role === 'parent') {
    return <ParentDashboard />;
  }

  return <StudentProgress />;
}