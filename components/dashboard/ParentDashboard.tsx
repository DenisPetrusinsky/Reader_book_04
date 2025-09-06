import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, Avatar, Chip, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService } from '../../services/gamification';
import { useAlert } from '../ui/CustomAlert';

interface StudentData {
  id: string;
  full_name: string;
  points: number;
  diamonds: number;
  currentStreak: number;
  level: number;
  totalRecordings: number;
  pendingAssignments: number;
  completedToday: boolean;
}

export function ParentDashboard() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const { user } = useAuth();
  const { showAlert, AlertModal } = useAlert();

  useEffect(() => {
    loadStudentData();
    loadRecentActivity();
  }, []);

  const loadStudentData = async () => {
    try {
      const studentData = await gamificationService.getStudentsByParent();
      setStudents(studentData);
    } catch (error: any) {
      console.error('❌ Load students error:', error);
      showAlert('Error', 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activity = await gamificationService.getRecentActivity();
      setRecentActivity(activity);
    } catch (error: any) {
      console.error('❌ Load activity error:', error);
    }
  };

  const getStreakStatus = (streak: number) => {
    if (streak >= 7) return { color: '#4CAF50', text: 'Great!' };
    if (streak >= 3) return { color: '#FF9800', text: 'Good' };
    if (streak >= 1) return { color: '#2196F3', text: 'Started' };
    return { color: '#F44336', text: 'Needs motivation' };
  };

  if (loading) {
    return (
      <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Parent Dashboard</Text>
            <Text style={styles.subtitleText}>Monitor your children's reading progress</Text>
          </View>

          {/* Students Overview */}
          <Card style={styles.overviewCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>Students Overview</Text>
              <View style={styles.overviewStats}>
                <View style={styles.overviewStat}>
                  <MaterialIcons name="people" size={24} color="#2196F3" />
                  <Text style={styles.overviewNumber}>{students.length}</Text>
                  <Text style={styles.overviewLabel}>Students</Text>
                </View>
                <View style={styles.overviewStat}>
                  <MaterialIcons name="book" size={24} color="#4CAF50" />
                  <Text style={styles.overviewNumber}>
                    {students.reduce((sum, s) => sum + s.totalRecordings, 0)}
                  </Text>
                  <Text style={styles.overviewLabel}>Total Books</Text>
                </View>
                <View style={styles.overviewStat}>
                  <MaterialIcons name="assignment-turned-in" size={24} color="#FF9800" />
                  <Text style={styles.overviewNumber}>
                    {students.filter(s => s.completedToday).length}
                  </Text>
                  <Text style={styles.overviewLabel}>Read Today</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Student Cards */}
          {students.map((student) => {
            const streakStatus = getStreakStatus(student.currentStreak);
            return (
              <Card key={student.id} style={styles.studentCard}>
                <Card.Content>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentInfo}>
                      <Avatar.Text 
                        size={48} 
                        label={student.full_name?.charAt(0) || 'S'} 
                        style={styles.avatar}
                      />
                      <View style={styles.studentDetails}>
                        <Text style={styles.studentName}>{student.full_name}</Text>
                        <Text style={styles.studentLevel}>Level {student.level}</Text>
                      </View>
                    </View>
                    {student.completedToday && (
                      <Chip icon="check" style={styles.todayChip}>
                        Read Today
                      </Chip>
                    )}
                  </View>

                  <View style={styles.studentStats}>
                    <View style={styles.studentStat}>
                      <MaterialIcons name="star" size={16} color="#FFD700" />
                      <Text style={styles.statText}>{student.points} pts</Text>
                    </View>
                    <View style={styles.studentStat}>
                      <MaterialIcons name="diamond" size={16} color="#00BCD4" />
                      <Text style={styles.statText}>{student.diamonds}</Text>
                    </View>
                    <View style={styles.studentStat}>
                      <MaterialIcons name="whatshot" size={16} color={streakStatus.color} />
                      <Text style={[styles.statText, { color: streakStatus.color }]}>
                        {student.currentStreak} days
                      </Text>
                    </View>
                  </View>

                  {student.pendingAssignments > 0 && (
                    <View style={styles.pendingAssignments}>
                      <MaterialIcons name="assignment" size={16} color="#FF9800" />
                      <Text style={styles.pendingText}>
                        {student.pendingAssignments} pending assignment{student.pendingAssignments > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}

                  <View style={styles.studentActions}>
                    <Button 
                      mode="outlined" 
                      compact 
                      onPress={() => {}}
                      style={styles.actionButton}
                    >
                      View Progress
                    </Button>
                    <Button 
                      mode="contained" 
                      compact 
                      onPress={() => {}}
                      style={styles.actionButton}
                    >
                      Assign Reading
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          })}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card style={styles.activityCard}>
              <Card.Content>
                <Text style={styles.cardTitle}>Recent Activity</Text>
                {recentActivity.map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <MaterialIcons 
                      name={activity.type === 'recording' ? 'mic' : 'emoji-events'} 
                      size={20} 
                      color="#4CAF50" 
                    />
                    <View style={styles.activityText}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Quick Actions */}
          <Card style={styles.actionsCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <View style={styles.quickActions}>
                <Button 
                  mode="contained" 
                  icon="assignment" 
                  onPress={() => {}}
                  style={styles.quickAction}
                >
                  Create Assignment
                </Button>
                <Button 
                  mode="contained" 
                  icon="people" 
                  onPress={() => {}}
                  style={styles.quickAction}
                >
                  Add Student
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
  subtitleText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 4,
  },
  overviewCard: {
    borderRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  studentCard: {
    borderRadius: 12,
    elevation: 4,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#4CAF50',
  },
  studentDetails: {
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  studentLevel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  todayChip: {
    backgroundColor: '#E8F5E8',
  },
  studentStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  studentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  pendingAssignments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  activityCard: {
    borderRadius: 12,
    elevation: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityText: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionsCard: {
    borderRadius: 12,
    elevation: 4,
  },
  quickActions: {
    gap: 8,
  },
  quickAction: {
    backgroundColor: '#2196F3',
  },
});