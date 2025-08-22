import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../components/auth/AuthProvider';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { authState, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>
          {authState.user?.firstName} {authState.user?.lastName}
        </Text>
        
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{authState.user?.email}</Text>
        
        <Text style={styles.label}>Member Since</Text>
        <Text style={styles.value}>
          {authState.user?.createdAt ? new Date(authState.user.createdAt).toLocaleDateString() : 'Unknown'}
        </Text>
      </View>

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="secondary"
        style={styles.logoutButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 32,
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    color: '#333',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logoutButton: {
    marginTop: 32,
  },
});