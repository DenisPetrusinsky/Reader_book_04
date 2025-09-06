import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isParent = user?.role === 'parent';

  const tabBarStyle = {
    height: Platform.select({
      ios: insets.bottom + 60,
      default: 70
    }),
    paddingTop: 8,
    paddingBottom: Platform.select({
      ios: insets.bottom + 8,
      default: 8
    }),
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isParent ? 'Dashboard' : 'Progress',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons 
              name={isParent ? "dashboard" : "trending-up"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      {!isParent && (
        <Tabs.Screen
          name="assignments"
          options={{
            title: 'Books',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="book" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="recorder"
        options={{
          title: isParent ? 'Students' : 'Record',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons 
              name={isParent ? "people" : "mic"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Recordings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
        }}
      />
      {!isParent && (
        <Tabs.Screen
          name="achievements"
          options={{
            title: 'Rewards',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="emoji-events" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}