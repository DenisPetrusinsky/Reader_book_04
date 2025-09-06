import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { AudioRecord, CreateAudioRecordData, UpdateAudioRecordData } from '../types/audio';

export const audioService = {
  // Initialize audio session
  async initializeAudio() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      console.log('🎤 Audio initialized successfully');
    } catch (error) {
      console.error('❌ Audio initialization error:', error);
      throw error;
    }
  },

  // Create new recording
  async createRecording() {
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      console.log('🎤 Recording prepared');
      return recording;
    } catch (error) {
      console.error('❌ Recording creation error:', error);
      throw error;
    }
  },

  // Upload audio file to Supabase Storage
  async uploadAudioFile(uri: string, fileName: string): Promise<string> {
    try {
      console.log('📤 Starting upload process...');
      console.log('📁 Local file URI:', uri);
      console.log('📝 Target filename:', fileName);
      console.log('📱 Platform:', Platform.OS);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('👤 User authenticated:', user.id);

      let blob: Blob;
      
      // Platform-specific file handling
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        console.log(`📱 ${Platform.OS} platform detected, using FileSystem`);
        
        try {
          // For mobile platforms, use expo-file-system to read the file
          const fileInfo = await FileSystem.getInfoAsync(uri);
          console.log('📊 File info:', fileInfo);
          
          if (!fileInfo.exists) {
            throw new Error(`File does not exist on ${Platform.OS}`);
          }
          
          // Read file as base64
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log('📊 Base64 data length:', base64Data.length);
          
          // For mobile platforms, upload the base64 data directly
          const filePath = `${user.id}/${fileName}`;
          console.log('🎯 Target storage path:', filePath);
          
          // Convert base64 to Uint8Array for upload
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          
          const { data, error } = await supabase.storage
            .from('audio-files')
            .upload(filePath, byteArray, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'audio/m4a'
            });

          if (error) {
            console.error('❌ Supabase storage error:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            throw error;
          }

          console.log('✅ Upload successful!');
          console.log('📁 Stored path:', data.path);
          console.log('🔗 Full path:', data.fullPath);
          
          // Verify upload by checking if file exists
          const { data: fileList, error: listError } = await supabase.storage
            .from('audio-files')
            .list(user.id);
          
          if (!listError) {
            console.log('📂 Files in user folder:', fileList?.map(f => f.name));
          }

          return data.path;
          
        } catch (fileSystemError) {
          console.error(`❌ ${Platform.OS} FileSystem error:`, fileSystemError);
          throw new Error(`${Platform.OS} file processing failed: ${fileSystemError}`);
        }
      } else {
        // For web, use fetch
        console.log('🌐 Web platform detected, using fetch');
        try {
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Local file fetch failed: ${response.status}`);
          }
          blob = await response.blob();
          console.log('📊 Fetch blob size:', blob.size, 'bytes');
          console.log('📋 File type:', blob.type);
        } catch (fetchError) {
          console.error('❌ Fetch error:', fetchError);
          throw new Error(`Failed to process local audio file: ${fetchError}`);
        }
        
        if (blob.size === 0) {
          throw new Error('Audio file is empty');
        }

        const filePath = `${user.id}/${fileName}`;
        console.log('🎯 Target storage path:', filePath);
        
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('❌ Supabase storage error:', error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          throw error;
        }

        console.log('✅ Upload successful!');
        console.log('📁 Stored path:', data.path);
        console.log('🔗 Full path:', data.fullPath);
        
        // Verify upload by checking if file exists
        const { data: fileList, error: listError } = await supabase.storage
          .from('audio-files')
          .list(user.id);
        
        if (!listError) {
          console.log('📂 Files in user folder:', fileList?.map(f => f.name));
        }

        return data.path;
      }
    } catch (error) {
      console.error('❌ Upload audio file error:', error);
      throw error;
    }
  },

  // Get audio file URL from Supabase Storage
  async getAudioFileUrl(filePath: string): Promise<string> {
    try {
      console.log('🔗 Starting URL generation...');
      console.log('📁 Input file path:', filePath);
      
      if (!filePath || filePath.trim() === '') {
        throw new Error('File path is empty or undefined');
      }

      // First check if file exists
      console.log('🔍 Checking if file exists...');
      const { data: fileData, error: fileError } = await supabase.storage
        .from('audio-files')
        .list('', {
          search: filePath.split('/').pop() // Get filename
        });

      if (fileError) {
        console.error('❌ File existence check error:', fileError);
      } else {
        console.log('📂 Storage check result:', fileData?.length, 'files found');
      }

      // Generate signed URL instead of public URL for better reliability
      console.log('🔐 Generating signed URL...');
      const { data: signedData, error: signedError } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (signedError) {
        console.error('❌ Signed URL error:', signedError);
        // Fallback to public URL
        console.log('🔄 Falling back to public URL...');
        const { data: publicData } = supabase.storage
          .from('audio-files')
          .getPublicUrl(filePath);
        
        console.log('🔗 Public URL:', publicData.publicUrl);
        
        if (!publicData.publicUrl || publicData.publicUrl.includes('undefined')) {
          throw new Error('Failed to generate valid file URL');
        }
        
        return publicData.publicUrl;
      }

      console.log('✅ Signed URL generated successfully');
      console.log('🔗 Final URL:', signedData.signedUrl);
      
      if (!signedData.signedUrl) {
        throw new Error('Signed URL is null or undefined');
      }

      // Test URL accessibility
      try {
        console.log('🧪 Testing URL accessibility...');
        const testResponse = await fetch(signedData.signedUrl, { method: 'HEAD' });
        console.log('📊 URL test status:', testResponse.status);
        if (!testResponse.ok) {
          console.warn('⚠️ URL test failed but proceeding anyway');
        } else {
          console.log('✅ URL is accessible');
        }
      } catch (testError) {
        console.warn('⚠️ URL test failed:', testError);
      }

      return signedData.signedUrl;
    } catch (error) {
      console.error('❌ Get audio file URL error:', error);
      throw error;
    }
  },

  // Save audio record metadata to database
  async saveAudioRecord(data: CreateAudioRecordData): Promise<AudioRecord> {
    try {
      console.log('💾 Saving audio record:', data.title);
      
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Include user_id in the record data
      const recordData = {
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        file_path: data.file_path,
        file_size: data.file_size || null,
        duration: data.duration || null,
        points_earned: data.points_earned || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Inserting record with data:', recordData);
      
      // Remove .single() to avoid the coercion error
      const { data: records, error } = await supabase
        .from('audio_records')
        .insert(recordData)
        .select();

      if (error) {
        console.error('❌ Save record error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (!records || records.length === 0) {
        throw new Error('No record was created');
      }

      const record = records[0];
      console.log('✅ Audio record saved successfully:', record);
      return record;
    } catch (error) {
      console.error('❌ Save audio record error:', error);
      throw error;
    }
  },

  // Get user's audio records
  async getUserAudioRecords(): Promise<AudioRecord[]> {
    try {
      console.log('📖 Fetching user audio records');
      
      const { data: records, error } = await supabase
        .from('audio_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Fetch records error:', error);
        throw error;
      }

      console.log('✅ Audio records fetched successfully:', records?.length || 0);
      return records || [];
    } catch (error) {
      console.error('❌ Get audio records error:', error);
      throw error;
    }
  },

  // Update audio record
  async updateAudioRecord(id: string, updates: UpdateAudioRecordData): Promise<AudioRecord> {
    try {
      console.log('📝 Updating audio record:', id);
      
      const { data: records, error } = await supabase
        .from('audio_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Update record error:', error);
        throw error;
      }

      if (!records || records.length === 0) {
        throw new Error('No record was updated');
      }

      const record = records[0];
      console.log('✅ Audio record updated successfully');
      return record;
    } catch (error) {
      console.error('❌ Update audio record error:', error);
      throw error;
    }
  },

  // Delete audio record and file
  async deleteAudioRecord(id: string, filePath: string): Promise<void> {
    try {
      console.log('🗑️ Deleting audio record:', id);
      
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('audio-files')
        .remove([filePath]);

      if (storageError) {
        console.error('❌ Delete file error:', storageError);
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from('audio_records')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('❌ Delete record error:', dbError);
        throw dbError;
      }

      console.log('✅ Audio record deleted successfully');
    } catch (error) {
      console.error('❌ Delete audio record error:', error);
      throw error;
    }
  },

  // Format duration for display
  formatDuration(seconds?: number): string {
    if (!seconds) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Format file size for display
  formatFileSize(bytes?: number): string {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  },
};