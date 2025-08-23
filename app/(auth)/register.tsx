// app/(auth)/register.tsx - Updated with proper success handling
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../components/auth/AuthProvider';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register, authState } = useAuth();

  // Navigate to main app when user becomes authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      console.log('✅ RegisterScreen: User authenticated, navigating to main app');
      router.replace('/(tabs)');
    }
  }, [authState.isAuthenticated, authState.user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    console.log('📝 RegisterScreen: Starting registration process...');

    // First, validate the form
    if (!validateForm()) {
      console.log('❌ RegisterScreen: Form validation failed');
      return;
    }

    try {
      console.log('📝 RegisterScreen: Calling register function...');
      const result = await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      console.log('📝 RegisterScreen: Register result:', result);

      if (!result.success) {
        console.log('❌ RegisterScreen: Registration failed:', result.error);
        Alert.alert('Registration Failed', result.error || 'Registration failed');
        return;
      }

      console.log('✅ RegisterScreen: Registration successful');
      // Navigation will be handled by useEffect when authState changes

    } catch (error) {
      console.error('❌ RegisterScreen: Registration error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Lorodex today</Text>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <Input
                label="First Name"
                value={formData.firstName}
                onChangeText={(value) => updateField('firstName', value)}
                error={errors.firstName}
                placeholder="John"
                style={styles.nameInput}
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChangeText={(value) => updateField('lastName', value)}
                error={errors.lastName}
                placeholder="Doe"
                style={styles.nameInput}
              />
            </View>

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              placeholder="john@example.com"
            />

            <Input
              label="Password"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
              error={errors.password}
              placeholder="Create a password"
            />

            <Input
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
              error={errors.confirmPassword}
              placeholder="Confirm your password"
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={authState.isLoading}
              style={styles.registerButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              <Text style={styles.linkText}>Sign in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  link: {
    marginLeft: 4,
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
