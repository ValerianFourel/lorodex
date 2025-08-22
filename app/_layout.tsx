// app/_layout.tsx
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../components/auth/AuthProvider';
import { initializeDatabase } from '../lib/database';

export default function RootLayout() {

  // Initialize SQLite database when app starts
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // In production, you might want to show an error screen or retry mechanism
      }
    };

    setupDatabase();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Slot />
    </AuthProvider>
  );
}
