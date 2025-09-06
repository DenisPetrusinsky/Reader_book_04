export interface AudioRecord {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_path: string;
  file_size?: number;
  duration?: number;
  created_at: string;
  updated_at: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
  duration: number;
}

export interface CreateAudioRecordData {
  title: string;
  description?: string;
  file_path: string;
  file_size?: number;
  duration?: number;
}

export interface UpdateAudioRecordData {
  title?: string;
  description?: string;
}