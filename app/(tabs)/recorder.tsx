import React, { useState } from 'react';
import { AudioRecorder } from '../../components/audio/AudioRecorder';

export default function RecorderTab() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRecordingSaved = () => {
    // Trigger refresh by updating key for this component
    setRefreshKey(prev => prev + 1);
    
    // Also notify other tabs that data has changed
    console.log('📊 Recording saved, other tabs should refresh when focused');
  };

  return <AudioRecorder key={refreshKey} onRecordingSaved={handleRecordingSaved} />;
}