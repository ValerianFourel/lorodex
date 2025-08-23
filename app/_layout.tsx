// app/_layout.tsx - Updated to handle immediate web fallback properly
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../components/auth/AuthProvider';
import { initializeDatabase, isUsingWebFallback } from '../lib/database';
import { Platform } from 'react-native';

const setupDatabase = async () => {
  console.log('🚀 _layout.tsx: Setting up database...');
  console.log('🚀 _layout.tsx: Platform.OS:', Platform.OS);

  if (Platform.OS === 'web') {
    console.log('🌐 _layout.tsx: Web platform detected - localStorage fallback will be used automatically');
    console.log('🌐 _layout.tsx: isUsingWebFallback():', isUsingWebFallback());
    return;
  }

  try {
    console.log('📱 _layout.tsx: Attempting mobile database initialization...');
    await initializeDatabase();
    console.log('✅ _layout.tsx: Database initialized successfully');

    if (isUsingWebFallback()) {
      console.log('🌐 _layout.tsx: Using localStorage fallback mode');
    } else {
      console.log('📱 _layout.tsx: Using SQLite database');
    }
  } catch (error) {
    console.error('❌ _layout.tsx: Failed to initialize database:', error);
    console.log('🌐 _layout.tsx: Continuing with localStorage fallback mode');
  }
};

export default function RootLayout() {
  useEffect(() => {
    console.log('🚀 _layout.tsx: useEffect triggered');
    setupDatabase();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Slot />
    </AuthProvider>
  );
}
