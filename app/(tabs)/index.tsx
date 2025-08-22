import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../components/auth/AuthProvider';

export default function HomeScreen() {
  const { authState } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {authState.user?.firstName}!</Text>
      <Text style={styles.subtitle}>You're successfully authenticated</Text>
      <Text style={styles.email}>Logged in as: {authState.user?.email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  email: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});