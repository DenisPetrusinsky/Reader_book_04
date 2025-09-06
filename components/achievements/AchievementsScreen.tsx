import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Badge, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService } from '../../services/gamification';
import { useAlert } from '../ui/CustomAlert';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_reward: number;
  diamonds_reward: number;
  requirement_type: string;
  requirement_value: number;
  earned: boolean;
  earned_at?: string;
  progress?: number;
}

export function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);

  const { user } = useAuth();
  const { showAlert, AlertModal } = useAlert();

  useEffect(() => {
    loadAchievements();
    loadUserStats();
  }, []);

  const loadAchievements = async () => {
    try {
      const achievementData = await gamificationService.getAllAchievements();
      setAchievements(achievementData);
    } catch (error: any) {
      console.error('❌ Load achievements error:', error);
      showAlert('Error', 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const stats = await gamificationService.getStudentProgress();
      setUserStats(stats);
    } catch (error: any) {
      console.error('❌ Load stats error:', error);
    }
  };

  const getProgressPercentage = (achievement: Achievement) => {
    if (achievement.earned) return 1;
    if (!userStats) return 0;
    
    let current = 0;
    switch (achievement.requirement_type) {
      case 'total_recordings':
        current = userStats.totalRecordings || 0;
        break;
      case 'streak':
        current = userStats.currentStreak || 0;
        break;
      case 'points':
        current = userStats.points || 0;
        break;
      case 'perfect_week':
        current = userStats.perfectWeeks || 0;
        break;
      default:
        current = 0;
    }
    
    return Math.min(current / achievement.requirement_value, 1);
  };

  const getProgressText = (achievement: Achievement) => {
    if (achievement.earned) return 'Completed!';
    if (!userStats) return '0/0';
    
    let current = 0;
    switch (achievement.requirement_type) {
      case 'total_recordings':
        current = userStats.totalRecordings || 0;
        break;
      case 'streak':
        current = userStats.currentStreak || 0;
        break;
      case 'points':
        current = userStats.points || 0;
        break;
      case 'perfect_week':
        current = userStats.perfectWeeks || 0;
        break;
      default:
        current = 0;
    }
    
    return `${current}/${achievement.requirement_value}`;
  };

  const getIconName = (iconString: string): any => {
    const iconMap: { [key: string]: any } = {
      'mic': 'mic',
      'book': 'book',
      'book-open': 'menu-book',
      'crown': 'workspace-premium',
      'fire': 'whatshot',
      'zap': 'flash-on',
      'trophy': 'emoji-events',
      'star': 'star',
      'diamond': 'diamond',
      'calendar-check': 'event-available',
    };
    return iconMap[iconString] || 'emoji-events';
  };

  const earnedAchievements = achievements.filter(a => a.earned);
  const unlockedAchievements = achievements.filter(a => !a.earned);

  if (loading) {
    return (
      <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading achievements...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Your Achievements 🏆</Text>
            <Text style={styles.subtitle}>
              {earnedAchievements.length} of {achievements.length} unlocked
            </Text>
          </View>

          {/* Progress Overview */}
          <Card style={styles.overviewCard}>
            <Card.Content>
              <Text style={styles.overviewTitle}>Overall Progress</Text>
              <ProgressBar 
                progress={achievements.length > 0 ? earnedAchievements.length / achievements.length : 0}
                color="#9C27B0"
                style={styles.overviewProgress}
              />
              <View style={styles.overviewStats}>
                <View style={styles.overviewStat}>
                  <MaterialIcons name="emoji-events" size={20} color="#FFD700" />
                  <Text style={styles.overviewNumber}>{earnedAchievements.length}</Text>
                  <Text style={styles.overviewLabel}>Earned</Text>
                </View>
                <View style={styles.overviewStat}>
                  <MaterialIcons name="star" size={20} color="#FFD700" />
                  <Text style={styles.overviewNumber}>
                    {earnedAchievements.reduce((sum, a) => sum + a.points_reward, 0)}
                  </Text>
                  <Text style={styles.overviewLabel}>Points</Text>
                </View>
                <View style={styles.overviewStat}>
                  <MaterialIcons name="diamond" size={20} color="#00BCD4" />
                  <Text style={styles.overviewNumber}>
                    {earnedAchievements.reduce((sum, a) => sum + a.diamonds_reward, 0)}
                  </Text>
                  <Text style={styles.overviewLabel}>Diamonds</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Earned Achievements */}
            {earnedAchievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌟 Unlocked Achievements</Text>
                {earnedAchievements.map((achievement) => (
                  <Card key={achievement.id} style={[styles.achievementCard, styles.earnedCard]}>
                    <Card.Content style={styles.achievementContent}>
                      <View style={styles.achievementHeader}>
                        <View style={[styles.achievementIcon, styles.earnedIcon]}>
                          <MaterialIcons 
                            name={getIconName(achievement.icon)} 
                            size={24} 
                            color="#FFD700" 
                          />
                        </View>
                        <View style={styles.achievementInfo}>
                          <Text style={styles.achievementName}>{achievement.name}</Text>
                          <Text style={styles.achievementDesc}>{achievement.description}</Text>
                        </View>
                        <View style={styles.achievementRewards}>
                          {achievement.points_reward > 0 && (
                            <Badge style={styles.pointsBadge}>+{achievement.points_reward}</Badge>
                          )}
                          {achievement.diamonds_reward > 0 && (
                            <Badge style={styles.diamondsBadge}>+{achievement.diamonds_reward}💎</Badge>
                          )}
                        </View>
                      </View>
                      {achievement.earned_at && (
                        <Text style={styles.earnedDate}>
                          Earned {new Date(achievement.earned_at).toLocaleDateString()}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}

            {/* In Progress Achievements */}
            {unlockedAchievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 In Progress</Text>
                {unlockedAchievements.map((achievement) => {
                  const progress = getProgressPercentage(achievement);
                  const progressText = getProgressText(achievement);
                  
                  return (
                    <Card key={achievement.id} style={styles.achievementCard}>
                      <Card.Content style={styles.achievementContent}>
                        <View style={styles.achievementHeader}>
                          <View style={[styles.achievementIcon, styles.lockedIcon]}>
                            <MaterialIcons 
                              name={getIconName(achievement.icon)} 
                              size={24} 
                              color="#999" 
                            />
                          </View>
                          <View style={styles.achievementInfo}>
                            <Text style={styles.achievementName}>{achievement.name}</Text>
                            <Text style={styles.achievementDesc}>{achievement.description}</Text>
                            <Text style={styles.progressText}>{progressText}</Text>
                          </View>
                          <View style={styles.achievementRewards}>
                            {achievement.points_reward > 0 && (
                              <Badge style={styles.lockedPointsBadge}>+{achievement.points_reward}</Badge>
                            )}
                            {achievement.diamonds_reward > 0 && (
                              <Badge style={styles.lockedDiamondsBadge}>+{achievement.diamonds_reward}💎</Badge>
                            )}
                          </View>
                        </View>
                        <ProgressBar 
                          progress={progress}
                          color="#9C27B0"
                          style={styles.achievementProgress}
                        />
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
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
  content: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 4,
  },
  overviewCard: {
    borderRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  overviewProgress: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  achievementCard: {
    borderRadius: 12,
    elevation: 4,
    marginBottom: 8,
  },
  earnedCard: {
    backgroundColor: '#FFF9C4',
  },
  achievementContent: {
    padding: 16,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  earnedIcon: {
    backgroundColor: '#FFF59D',
  },
  lockedIcon: {
    backgroundColor: '#f5f5f5',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#9C27B0',
    marginTop: 2,
    fontWeight: 'bold',
  },
  achievementRewards: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pointsBadge: {
    backgroundColor: '#FFD700',
  },
  diamondsBadge: {
    backgroundColor: '#00BCD4',
  },
  lockedPointsBadge: {
    backgroundColor: '#ddd',
  },
  lockedDiamondsBadge: {
    backgroundColor: '#ddd',
  },
  earnedDate: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  achievementProgress: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
});