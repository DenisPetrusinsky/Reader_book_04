import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, Badge, Chip, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { assignmentService } from '../../services/assignments';
import { useAlert } from '../ui/CustomAlert';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  book_title: string;
  target_duration?: number;
  points_reward: number;
  due_date?: string;
  status: string;
  created_at: string;
}

export function ReadingAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const { user } = useAuth();
  const { showAlert, AlertModal } = useAlert();

  useEffect(() => {
    loadAssignments();
  }, [filter]);

  const loadAssignments = async () => {
    try {
      const assignmentData = await assignmentService.getStudentAssignments(filter);
      setAssignments(assignmentData);
    } catch (error: any) {
      console.error('❌ Load assignments error:', error);
      showAlert('Error', 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const startReading = (assignment: Assignment) => {
    // Navigate to recorder with assignment context
    console.log('Starting reading for:', assignment.book_title);
    showAlert('Ready to Read!', `Let's start reading "${assignment.book_title}". Tap Record when ready!`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'reviewed':
        return '#2196F3';
      default:
        return '#FF9800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'reviewed':
        return 'verified';
      default:
        return 'schedule';
    }
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    return `~${minutes} min read`;
  };

  if (loading) {
    return (
      <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading your books...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Your Reading Books 📚</Text>
            <Text style={styles.subtitle}>Choose a book to read aloud</Text>
          </View>

          {/* Filter Chips */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            <Chip
              selected={filter === 'pending'}
              onPress={() => setFilter('pending')}
              style={styles.filterChip}
              textStyle={[styles.filterText, filter === 'pending' && styles.selectedFilterText]}
            >
              To Read ({assignments.filter(a => a.status === 'pending').length})
            </Chip>
            <Chip
              selected={filter === 'completed'}
              onPress={() => setFilter('completed')}
              style={styles.filterChip}
              textStyle={[styles.filterText, filter === 'completed' && styles.selectedFilterText]}
            >
              Completed ({assignments.filter(a => a.status === 'completed').length})
            </Chip>
            <Chip
              selected={filter === 'all'}
              onPress={() => setFilter('all')}
              style={styles.filterChip}
              textStyle={[styles.filterText, filter === 'all' && styles.selectedFilterText]}
            >
              All Books ({assignments.length})
            </Chip>
          </ScrollView>

          {/* Assignments List */}
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {assignments.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialIcons name="menu-book" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Books Available</Text>
                  <Text style={styles.emptySubtitle}>
                    {filter === 'pending' 
                      ? "You are all caught up! Great job reading!"
                      : `No ${filter} books found.`
                    }
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              assignments.map((assignment) => (
                <Card key={assignment.id} style={styles.assignmentCard}>
                  <Card.Content>
                    <View style={styles.assignmentHeader}>
                      <View style={styles.assignmentInfo}>
                        <Text style={styles.bookTitle}>{assignment.book_title}</Text>
                        {assignment.title && (
                          <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                        )}
                      </View>
                      <MaterialIcons 
                        name={getStatusIcon(assignment.status)} 
                        size={24} 
                        color={getStatusColor(assignment.status)} 
                      />
                    </View>

                    {assignment.description && (
                      <Text style={styles.description}>{assignment.description}</Text>
                    )}

                    <View style={styles.assignmentMeta}>
                      <View style={styles.metaRow}>
                        <MaterialIcons name="star" size={16} color="#FFD700" />
                        <Text style={styles.metaText}>{assignment.points_reward} points</Text>
                      </View>
                      {assignment.target_duration && (
                        <View style={styles.metaRow}>
                          <MaterialIcons name="schedule" size={16} color="#666" />
                          <Text style={styles.metaText}>{formatDuration(assignment.target_duration)}</Text>
                        </View>
                      )}
                      {assignment.due_date && (
                        <View style={styles.metaRow}>
                          <MaterialIcons name="event" size={16} color="#666" />
                          <Text style={[
                            styles.metaText,
                            formatDueDate(assignment.due_date) === 'Overdue' && styles.overdueText
                          ]}>
                            {formatDueDate(assignment.due_date)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {assignment.status === 'pending' && (
                      <Button
                        mode="contained"
                        onPress={() => startReading(assignment)}
                        style={styles.startButton}
                        contentStyle={styles.buttonContent}
                        icon="play-arrow"
                      >
                        Start Reading
                      </Button>
                    )}

                    {assignment.status === 'completed' && (
                      <View style={styles.completedBadge}>
                        <Badge style={styles.badge}>Completed! ✨</Badge>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))
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
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    gap: 8,
    paddingHorizontal: 4,
  },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterText: {
    color: '#ffffff',
  },
  selectedFilterText: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 16,
  },
  emptyCard: {
    borderRadius: 12,
    elevation: 4,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  assignmentCard: {
    borderRadius: 12,
    elevation: 4,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  assignmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  assignmentTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  assignmentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  overdueText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  buttonContent: {
    paddingVertical: 4,
  },
  completedBadge: {
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#4CAF50',
  },
});