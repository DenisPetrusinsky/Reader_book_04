import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, IconButton, Menu, Divider } from 'react-native-paper';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { audioService } from '../../services/audio';
import { useAlert } from '../ui/CustomAlert';
import { AudioRecord, PlaybackState } from '../../types/audio';

export function AudioHistory() {
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playback, setPlayback] = useState<Audio.Sound | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    position: 0,
    duration: 0,
  });
  const [playingRecordId, setPlayingRecordId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const { showAlert, AlertModal } = useAlert();

  useEffect(() => {
    loadRecords();
    return () => {
      // Cleanup playback on unmount
      if (playback) {
        playback.unloadAsync();
      }
    };
  }, []);

  const loadRecords = async () => {
    try {
      const audioRecords = await audioService.getUserAudioRecords();
      setRecords(audioRecords);
    } catch (error: any) {
      console.error('❌ Load records error:', error);
      showAlert('Load Error', 'Failed to load audio records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

    const playAudio = async (record: AudioRecord) => {
    try {
      console.log('🎵 Starting playback for:', record.title);
      
      // Stop current playback if any
      if (playback) {
        console.log('⏹️ Stopping current playback');
        await playback.unloadAsync();
        setPlayback(null);
        setPlayingRecordId(null);
      }

      // Initialize audio for playback
      console.log('🔧 Initializing audio for playback');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      // Get audio file URL
      console.log('📁 Getting audio file URL for:', record.file_path);
      const audioUrl = await audioService.getAudioFileUrl(record.file_path);
      console.log('🔗 Audio URL:', audioUrl);

      // Validate URL
      if (!audioUrl || audioUrl.includes('undefined')) {
        throw new Error('Invalid audio file URL');
      }

      // Create and load sound
      console.log('🎵 Creating audio sound object');
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { 
          shouldPlay: false, // Don't auto-play, we'll start manually
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );

      console.log('✅ Sound created successfully');
      setPlayback(sound);
      setPlayingRecordId(record.id);
      
      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackState({
            isPlaying: status.isPlaying || false,
            isPaused: !status.isPlaying && status.positionMillis! > 0,
            position: (status.positionMillis || 0) / 1000,
            duration: (status.durationMillis || 0) / 1000,
          });

          // Auto cleanup when finished
          if (status.didJustFinish) {
            console.log('🏁 Playback finished');
            setPlayingRecordId(null);
            setPlaybackState({
              isPlaying: false,
              isPaused: false,
              position: 0,
              duration: 0,
            });
          }
        } else if (status.error) {
          console.error('❌ Playback status error:', status.error);
        }
      });

      // Start playback
      console.log('▶️ Starting playback');
      await sound.playAsync();
      console.log('✅ Playback started for:', record.title);

    } catch (error: any) {
      console.error('❌ Play audio error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Cleanup on error
      if (playback) {
        try {
          await playback.unloadAsync();
        } catch (cleanupError) {
          console.error('❌ Cleanup error:', cleanupError);
        }
      }
      setPlayback(null);
      setPlayingRecordId(null);
      setPlaybackState({
        isPlaying: false,
        isPaused: false,
        position: 0,
        duration: 0,
      });

      // Show specific error messages
      let errorMessage = 'Failed to play audio file';
      if (error.message?.includes('Invalid audio file URL')) {
        errorMessage = 'Audio file not found or invalid URL';
      } else if (error.message?.includes('permission')) {
        errorMessage = 'Audio playback permission denied';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error - check your connection';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showAlert('Playback Error', errorMessage);
    }
  };

  const pauseAudio = async () => {
    try {
      if (playback) {
        await playback.pauseAsync();
        console.log('⏸️ Audio paused');
      }
    } catch (error: any) {
      console.error('❌ Pause audio error:', error);
    }
  };

  const resumeAudio = async () => {
    try {
      if (playback) {
        await playback.playAsync();
        console.log('▶️ Audio resumed');
      }
    } catch (error: any) {
      console.error('❌ Resume audio error:', error);
    }
  };

  const stopAudio = async () => {
    try {
      if (playback) {
        await playback.stopAsync();
        await playback.unloadAsync();
        setPlayback(null);
        setPlayingRecordId(null);
        setPlaybackState({
          isPlaying: false,
          isPaused: false,
          position: 0,
          duration: 0,
        });
        console.log('⏹️ Audio stopped');
      }
    } catch (error: any) {
      console.error('❌ Stop audio error:', error);
    }
  };

  const deleteRecord = async (record: AudioRecord) => {
    try {
      // Stop playback if this record is playing
      if (playingRecordId === record.id) {
        await stopAudio();
      }

      await audioService.deleteAudioRecord(record.id, record.file_path);
      showAlert('Deleted', 'Recording deleted successfully');
      loadRecords(); // Refresh list
    } catch (error: any) {
      console.error('❌ Delete record error:', error);
      showAlert('Delete Error', 'Failed to delete recording');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRecord = (record: AudioRecord) => {
    const isPlaying = playingRecordId === record.id;
    
    return (
      <Card key={record.id} style={styles.recordCard}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.recordHeader}>
            <View style={styles.recordInfo}>
              <Text style={styles.recordTitle}>{record.title}</Text>
              <Text style={styles.recordDate}>{formatDate(record.created_at)}</Text>
              {record.description && (
                <Text style={styles.recordDescription}>{record.description}</Text>
              )}
            </View>
            
            <Menu
              visible={menuVisible === record.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(record.id)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  deleteRecord(record);
                }}
                title="Delete"
                leadingIcon="delete"
              />
            </Menu>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.recordFooter}>
            <View style={styles.recordMeta}>
              <Text style={styles.metaText}>
                {audioService.formatDuration(record.duration)}
              </Text>
              {record.file_size && (
                <Text style={styles.metaText}>
                  {audioService.formatFileSize(record.file_size)}
                </Text>
              )}
            </View>

            <View style={styles.playbackControls}>
              {!isPlaying && (
                <IconButton
                  icon="play"
                  size={32}
                  iconColor="#667eea"
                  style={styles.playButton}
                  onPress={() => playAudio(record)}
                />
              )}

              {isPlaying && playbackState.isPlaying && (
                <IconButton
                  icon="pause"
                  size={32}
                  iconColor="#f39c12"
                  style={styles.playButton}
                  onPress={pauseAudio}
                />
              )}

              {isPlaying && playbackState.isPaused && (
                <IconButton
                  icon="play"
                  size={32}
                  iconColor="#27ae60"
                  style={styles.playButton}
                  onPress={resumeAudio}
                />
              )}

              {isPlaying && (
                <IconButton
                  icon="stop"
                  size={28}
                  iconColor="#e74c3c"
                  onPress={stopAudio}
                />
              )}
            </View>
          </View>

          {/* Playback Progress */}
          {isPlaying && playbackState.duration > 0 && (
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${(playbackState.position / playbackState.duration) * 100}%` }
                ]} 
              />
              <Text style={styles.progressText}>
                {audioService.formatDuration(playbackState.position)} / {audioService.formatDuration(playbackState.duration)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading recordings...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>Recording History</Text>
          
          {records.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="mic-none" size={64} color="#ffffff" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No Recordings Yet</Text>
              <Text style={styles.emptySubtitle}>
                Start recording to see your audio files here
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {records.map(renderRecord)}
            </ScrollView>
          )}
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
    padding: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  recordCard: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordInfo: {
    flex: 1,
    marginRight: 8,
  },
  recordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recordDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 12,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    margin: 0,
  },
  progressContainer: {
    marginTop: 12,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    position: 'relative',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});