import { Redirect } from 'expo-router';
import { useAuth } from '../components/auth/AuthProvider';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { authState } = useAuth();

  // Show loading while checking auth state
  if (authState.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Redirect based on auth state
  if (authState.isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}