// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../components/auth/AuthProvider';
import { ActivityIndicator, View, Text } from 'react-native';

export default function TabLayout() {
  const { authState } = useAuth();

  // Show loading screen while checking auth
  if (authState.isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!authState.isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
      }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📇</Text>,
        }}
      />
      <Tabs.Screen
        name="create-card"
        options={{
          href: null, // Hide from tab bar - this is a modal/detail screen
          title: 'Create Card',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
