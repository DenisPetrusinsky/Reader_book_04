import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, ProgressBar, Badge, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService } from '../../services/gamification';
import { useAlert } from '../ui/CustomAlert';

interface ProgressStats {
  points: number;
  diamonds: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  totalRecordings: number;
  thisWeekRecordings: number;
  nextLevelPoints: number;
}

export function StudentProgress() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);

  const { user } = useAuth();
  const { showAlert, AlertModal } = useAlert();
  const router = useRouter();

  // Refresh data when tab becomes focused
  useFocusEffect(
    React.useCallback(() => {
      refreshAllStats();
    }, [])
  );

  useEffect(() => {
    loadProgressStats();
    loadRecentAchievements();
  }, []);

  const refreshAllStats = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProgressStats(),
      loadRecentAchievements()
    ]);
    setRefreshing(false);
  };

  const loadProgressStats = async () => {
    try {
      const progressData = await gamificationService.getStudentProgress();
      setStats(progressData);
    } catch (error: any) {
      console.error('❌ Load progress error:', error);
      console.error('Failed to load progress data, using defaults');
      // Set default stats instead of showing error
      setStats({
        points: 0,
        diamonds: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        totalRecordings: 0,
        thisWeekRecordings: 0,
        nextLevelPoints: 100,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentAchievements = async () => {
    try {
      const achievements = await gamificationService.getRecentAchievements(5);
      setRecentAchievements(achievements);
    } catch (error: any) {
      console.error('❌ Load achievements error:', error);
    }
  };

  const getLevelProgress = () => {
    if (!stats) return 0;
    const currentLevelMin = (stats.level - 1) * 100;
    const nextLevelMin = stats.level * 100;
    const progress = (stats.points - currentLevelMin) / (nextLevelMin - currentLevelMin);
    return Math.max(0, Math.min(1, progress));
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '✨';
    if (streak >= 3) return '🌟';
    return '📚';
  };

  if (loading) {
    return (
      <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading your progress...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome back, {user?.full_name || 'Reader'}!</Text>
            <Text style={styles.motivationText}>Keep up the great reading! 📚</Text>
          </View>

          {/* Stats Cards Row */}
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, styles.pointsCard]}>
              <Card.Content style={styles.statContent}>
                <MaterialIcons name="star" size={24} color="#FFD700" />
                <Text style={styles.statNumber}>{stats?.points || 0}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, styles.diamondsCard]}>
              <Card.Content style={styles.statContent}>
                <MaterialIcons name="diamond" size={24} color="#00BCD4" />
                <Text style={styles.statNumber}>{stats?.diamonds || 0}</Text>
                <Text style={styles.statLabel}>Diamonds</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, styles.streakCard]}>
              <Card.Content style={styles.statContent}>
                <Text style={styles.streakEmoji}>{getStreakEmoji(stats?.currentStreak || 0)}</Text>
                <Text style={styles.statNumber}>{stats?.currentStreak || 0}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </Card.Content>
            </Card>
          </View>

          {/* Level Progress */}
          <Card style={styles.levelCard}>
            <Card.Content>
              <View style={styles.levelHeader}>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelTitle}>Level {stats?.level || 1}</Text>
                  <Text style={styles.levelSubtitle}>
                    {stats?.nextLevelPoints || 100 - (stats?.points || 0)} points to next level
                  </Text>
                </View>
                <Badge style={styles.levelBadge}>
                  {stats?.level || 1}
                </Badge>
              </View>
              <ProgressBar 
                progress={getLevelProgress()} 
                color="#4CAF50" 
                style={styles.progressBar}
              />
            </Card.Content>
          </Card>

          {/* This Week Stats */}
          <Card style={styles.weekCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>This Week</Text>
              <View style={styles.weekStats}>
                <View style={styles.weekStat}>
                  <MaterialIcons name="mic" size={20} color="#4CAF50" />
                  <Text style={styles.weekStatNumber}>{stats?.thisWeekRecordings || 0}</Text>
                  <Text style={styles.weekStatLabel}>Recordings</Text>
                </View>
                <View style={styles.weekStat}>
                  <MaterialIcons name="book" size={20} color="#FF9800" />
                  <Text style={styles.weekStatNumber}>{stats?.totalRecordings || 0}</Text>
                  <Text style={styles.weekStatLabel}>Total Books</Text>
                </View>
                <View style={styles.weekStat}>
                  <MaterialIcons name="whatshot" size={20} color="#F44336" />
                  <Text style={styles.weekStatNumber}>{stats?.longestStreak || 0}</Text>
                  <Text style={styles.weekStatLabel}>Best Streak</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <Card style={styles.achievementsCard}>
              <Card.Content>
                <Text style={styles.cardTitle}>Recent Achievements 🏆</Text>
                {recentAchievements.map((achievement, index) => (
                  <View key={index} style={styles.achievementItem}>
                    <MaterialIcons 
                      name={achievement.icon || 'emoji-events'} 
                      size={24} 
                      color="#FFD700" 
                    />
                    <View style={styles.achievementText}>
                      <Text style={styles.achievementName}>{achievement.name}</Text>
                      <Text style={styles.achievementDesc}>{achievement.description}</Text>
                    </View>
                    <Badge style={styles.achievementBadge}>
                      +{achievement.points_reward}
                    </Badge>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Motivation Card */}
          <Card style={styles.motivationCard}>
            <Card.Content>
              <Text style={styles.motivationTitle}>Keep Reading! 📖</Text>
              <Text style={styles.motivationMessage}>
                {stats?.currentStreak === 0 
                  ? "Start your reading streak today!"
                  : `Amazing! You are on a ${stats?.currentStreak}-day streak!`
                }
              </Text>
              <Button 
                mode="contained" 
                style={styles.motivationButton}
                onPress={() => router.push('/(tabs)/recorder')}
              >
                Start Reading Now
              </Button>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  motivationText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 4,
  },
  pointsCard: {
    backgroundColor: '#FFF9C4',
  },
  diamondsCard: {
    backgroundColor: '#E0F7FA',
  },
  streakCard: {
    backgroundColor: '#FFECB3',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  streakEmoji: {
    fontSize: 24,
  },
  levelCard: {
    borderRadius: 12,
    elevation: 4,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  levelSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  levelBadge: {
    backgroundColor: '#4CAF50',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  weekCard: {
    borderRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekStat: {
    alignItems: 'center',
  },
  weekStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  weekStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementsCard: {
    borderRadius: 12,
    elevation: 4,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  achievementText: {
    flex: 1,
    marginLeft: 12,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementBadge: {
    backgroundColor: '#4CAF50',
  },
  motivationCard: {
    borderRadius: 12,
    elevation: 4,
    backgroundColor: '#E8F5E8',
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  motivationMessage: {
    fontSize: 14,
    color: '#388E3C',
    textAlign: 'center',
    marginVertical: 8,
  },
  motivationButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
});