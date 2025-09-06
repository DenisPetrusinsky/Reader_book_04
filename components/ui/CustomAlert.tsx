import React, { useState } from 'react';
import { Platform, Alert, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  onOk?: () => void;
}

export const useAlert = () => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message, onOk });
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const AlertModal = () => {
    if (Platform.OS !== 'web') return null;

    return (
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity
              style={styles.okButton}
              onPress={() => {
                alertConfig.onOk?.();
                setAlertConfig(prev => ({ ...prev, visible: false }));
              }}
            >
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return { showAlert, AlertModal };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    minWidth: 280,
    maxWidth: 340,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  okButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  okButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});