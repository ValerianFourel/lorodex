// app/(tabs)/profile.tsx
import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../components/auth/AuthProvider';

export default function ProfileScreen() {
  const { authState, logout } = useAuth();

  // Direct logout without confirmation dialog
  const handleDirectLogout = async () => {
    try {
      console.log('PROFILE: Direct logout starting...');
      console.log('PROFILE: Before logout - isAuthenticated:', authState.isAuthenticated);
      
      await logout();
      
      // Remove the immediate check since state updates are async
      console.log('PROFILE: Logout process completed, state will update shortly');
      
      // The AuthProvider should handle navigation automatically
      // But keep a short fallback just in case
      setTimeout(() => {
        if (authState.isAuthenticated) {
          console.log('PROFILE: Fallback navigation to login');
          router.replace('/(auth)/login');
        }
      }, 100); // Reduced timeout since logout is working
      
    } catch (error) {
      console.error('PROFILE: Direct logout error:', error);
    }
  };



  // Show loading state during logout
  if (authState.isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Logging out...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      
      <View style={styles.userInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>
            {authState.user?.firstName} {authState.user?.lastName}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{authState.user?.email}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {authState.user?.createdAt ? new Date(authState.user.createdAt).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>

        {/* Debug info */}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Debug Info:</Text>
          <Text style={styles.debugText}>Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Loading: {authState.isLoading ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>User ID: {authState.user?.id || 'None'}</Text>
        </View>
      </View>


      {/* Keep direct logout for testing if needed */}
      <Button
        title=" Logout "
        onPress={handleDirectLogout}
        style={[styles.logoutButton, { backgroundColor: '#333' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    color: '#333',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  debugInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  logoutButton: {
    margin: 16,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});