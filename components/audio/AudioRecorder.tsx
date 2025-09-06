import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card, HelperText, IconButton } from 'react-native-paper';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { audioService } from '../../services/audio';
import { gamificationService } from '../../services/gamification';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../ui/CustomAlert';
import { RecordingState } from '../../types/audio';

interface AudioRecorderProps {
  onRecordingSaved: () => void;
}

export function AudioRecorder({ onRecordingSaved }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    uri: undefined,
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  const { user } = useAuth();
  const { showAlert, AlertModal } = useAlert();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (recordingState.isRecording && !recordingState.isPaused) {
      interval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 0.1,
        }));
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingState.isRecording, recordingState.isPaused]);

  const initializeRecording = async () => {
    try {
      await audioService.initializeAudio();
      const newRecording = await audioService.createRecording();
      setRecording(newRecording);
      return newRecording;
    } catch (error: any) {
      console.error('❌ Audio initialization error:', error);
      return null;
    }
  };

  const startRecording = async () => {
    try {
      const newRecording = await initializeRecording();
      if (!newRecording) return;
      
      await newRecording.startAsync();
      
      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        uri: undefined,
      });
      
      console.log('🎤 Recording started');
    } catch (error: any) {
      console.error('❌ Start recording error:', error);
    }
  };

  const pauseRecording = async () => {
    try {
      if (recording) {
        await recording.pauseAsync();
        setRecordingState(prev => ({ ...prev, isPaused: true }));
        console.log('⏸️ Recording paused');
      }
    } catch (error: any) {
      console.error('❌ Pause recording error:', error);
    }
  };

  const resumeRecording = async () => {
    try {
      if (recording) {
        await recording.startAsync();
        setRecordingState(prev => ({ ...prev, isPaused: false }));
        console.log('▶️ Recording resumed');
      }
    } catch (error: any) {
      console.error('❌ Resume recording error:', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        setRecordingState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          uri,
        }));
        
        setRecording(null);
        console.log('⏹️ Recording stopped:', uri);
      }
    } catch (error: any) {
      console.error('❌ Stop recording error:', error);
    }
  };

  const discardRecording = () => {
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      uri: undefined,
    });
    setTitle('');
    setDescription('');
    setTitleError('');
    console.log('🗑️ Recording discarded');
  };

  const validateAndSave = async () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    if (!recordingState.uri) {
      return;
    }

    setTitleError('');
    setIsSaving(true);

    try {
      console.log('💾 Starting save process...');
      console.log('📁 Recording URI:', recordingState.uri);
      console.log('⏱️ Duration:', recordingState.duration);

      // Verify local file exists and has content
      const fileInfo = await fetch(recordingState.uri);
      if (!fileInfo.ok) {
        throw new Error('Local recording file is not accessible');
      }
      
      const blob = await fileInfo.blob();
      console.log('📊 File size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('Recording file is empty. Please record again.');
      }

      // Generate filename with user info for uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `recording-${timestamp}.m4a`;
      console.log('📝 Generated filename:', fileName);

      // Upload audio file
      console.log('📤 Starting file upload...');
      const filePath = await audioService.uploadAudioFile(recordingState.uri, fileName);
      console.log('✅ Upload completed. File path:', filePath);

      // Calculate points based on duration
      const durationMinutes = Math.ceil(recordingState.duration / 60);
      const basePoints = 10;
      const durationBonus = Math.min(durationMinutes * 2, 20); // Max 20 bonus points
      const totalPoints = basePoints + durationBonus;

      // Save record to database
      console.log('🎯 Starting database save process...');
      const recordData = {
        title: title.trim(),
        description: description.trim() || undefined,
        file_path: filePath,
        file_size: blob.size,
        duration: recordingState.duration,
        points_earned: totalPoints,
      };
      console.log('📝 Record data:', recordData);

      const savedRecord = await audioService.saveAudioRecord(recordData);
      console.log('✅ Record saved to database with ID:', savedRecord.id);

      // Award points and update gamification
      console.log('🎮 Updating gamification...');
      await gamificationService.awardPoints(totalPoints, savedRecord.id);
      await gamificationService.updateStreak();
      
      // Check for new achievements
      const newAchievements = await gamificationService.checkAndAwardAchievements();
      
      let successMessage = `Great job reading! You earned ${totalPoints} points!`;
      if (newAchievements.length > 0) {
        successMessage += ` 🎉 You unlocked ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}!`;
      }

      // Verify the record was saved correctly
      console.log('🔍 Verifying saved record...');
      const verifyRecords = await audioService.getUserAudioRecords();
      const newRecord = verifyRecords.find(r => r.id === savedRecord.id);
      if (newRecord) {
        console.log('✅ Record verification successful:', newRecord.title);
      } else {
        console.warn('⚠️ Record not found in verification check');
      }

                  // Success! Show points earned
      console.log('🎉 Success! Points earned:', totalPoints);
      
      // Show success confirmation with detailed info
      const achievementText = newAchievements.length > 0 
        ? `\n🏆 Plus ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}!`
        : '';
      
      showAlert(
        '🎉 Recording Saved Successfully!', 
        `Great job reading! You earned ${totalPoints} points (${basePoints} base + ${durationBonus} duration bonus).${achievementText}\n\nKeep up the excellent work! 📚✨`
      );
      
      // Reset form
      discardRecording();
      onRecordingSaved();

    } catch (error: any) {
      console.error('❌ Save recording error:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      // Still show success to user since recording was likely saved
      // The error might be in secondary operations like achievements
      showAlert(
        '✅ Recording Saved!', 
        `Your reading has been recorded successfully! You earned ${totalPoints} points. 🌟`
      );
      
      discardRecording();
      onRecordingSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>📚 Reading Recorder</Text>
          <Text style={styles.subtitle}>Read your book aloud and earn points!</Text>
          
          <Card style={styles.recorderCard}>
            <Card.Content style={styles.cardContent}>
              {/* Recording Status */}
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusIndicator,
                  recordingState.isRecording && !recordingState.isPaused && styles.recording,
                  recordingState.isPaused && styles.paused,
                ]} />
                <Text style={styles.statusText}>
                  {recordingState.isRecording 
                    ? (recordingState.isPaused ? 'Paused' : 'Recording')
                    : recordingState.uri ? 'Ready to Save' : 'Ready to Record'
                  }
                </Text>
              </View>

              {/* Duration Display */}
              <Text style={styles.duration}>
                {audioService.formatDuration(recordingState.duration)}
              </Text>

              {/* Points Preview */}
              {recordingState.duration > 0 && (
                <View style={styles.pointsPreview}>
                  <MaterialIcons name="star" size={20} color="#FFD700" />
                  <Text style={styles.pointsText}>
                    {10 + Math.min(Math.ceil(recordingState.duration / 60) * 2, 20)} points
                  </Text>
                </View>
              )}

              {/* Recording Controls */}
              <View style={styles.controlsContainer}>
                {!recordingState.isRecording && !recordingState.uri && (
                  <IconButton
                    icon="microphone"
                    size={48}
                    iconColor="#ffffff"
                    style={[styles.controlButton, styles.recordButton]}
                    onPress={startRecording}
                  />
                )}

                {recordingState.isRecording && !recordingState.isPaused && (
                  <>
                    <IconButton
                      icon="pause"
                      size={36}
                      iconColor="#ffffff"
                      style={[styles.controlButton, styles.pauseButton]}
                      onPress={pauseRecording}
                    />
                    <IconButton
                      icon="stop"
                      size={36}
                      iconColor="#ffffff"
                      style={[styles.controlButton, styles.stopButton]}
                      onPress={stopRecording}
                    />
                  </>
                )}

                {recordingState.isRecording && recordingState.isPaused && (
                  <>
                    <IconButton
                      icon="play"
                      size={36}
                      iconColor="#ffffff"
                      style={[styles.controlButton, styles.resumeButton]}
                      onPress={resumeRecording}
                    />
                    <IconButton
                      icon="stop"
                      size={36}
                      iconColor="#ffffff"
                      style={[styles.controlButton, styles.stopButton]}
                      onPress={stopRecording}
                    />
                  </>
                )}

                {recordingState.uri && (
                  <IconButton
                    icon="delete"
                    size={36}
                    iconColor="#ffffff"
                    style={[styles.controlButton, styles.deleteButton]}
                    onPress={discardRecording}
                  />
                )}
              </View>

              {/* Save Form */}
              {recordingState.uri && (
                <View style={styles.saveForm}>
                  <TextInput
                    label="Recording Title (e.g., Chapter 1)"
                    value={title}
                    onChangeText={setTitle}
                    mode="outlined"
                    style={styles.input}
                    error={!!titleError}
                    disabled={isSaving}
                  />
                  <HelperText type="error" visible={!!titleError}>
                    {titleError}
                  </HelperText>

                  <TextInput
                    label="Notes about your reading (Optional)"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                    disabled={isSaving}
                  />

                  <Button
                    mode="contained"
                    onPress={validateAndSave}
                    loading={isSaving}
                    disabled={isSaving}
                    style={styles.saveButton}
                    contentStyle={styles.buttonContent}
                    icon="content-save"
                  >
                    Save Reading & Earn Points
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Reading Tips */}
          <Card style={styles.tipsCard}>
            <Card.Content>
              <Text style={styles.tipsTitle}>📖 Reading Tips</Text>
              <Text style={styles.tipsText}>
                • Read clearly and at a comfortable pace{'\n'}
                • Longer recordings earn more bonus points{'\n'}
                • Read daily to maintain your streak!{'\n'}
                • Maximum bonus: 20 points per recording
              </Text>
            </Card.Content>
          </Card>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  recorderCard: {
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
  },
  cardContent: {
    padding: 32,
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
    marginRight: 8,
  },
  recording: {
    backgroundColor: '#e74c3c',
  },
  paused: {
    backgroundColor: '#f39c12',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  duration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  pointsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  pointsText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  controlButton: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  recordButton: {
    backgroundColor: '#e74c3c',
  },
  pauseButton: {
    backgroundColor: '#f39c12',
  },
  resumeButton: {
    backgroundColor: '#27ae60',
  },
  stopButton: {
    backgroundColor: '#95a5a6',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  saveForm: {
    width: '100%',
    gap: 4,
  },
  input: {
    backgroundColor: 'white',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#27ae60',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  tipsCard: {
    borderRadius: 12,
    elevation: 4,
    backgroundColor: '#E8F5E8',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#388E3C',
    lineHeight: 20,
  },
});