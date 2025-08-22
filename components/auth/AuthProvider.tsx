// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, AuthState, LoginCredentials, RegisterCredentials, User } from '../../types/auth';
import { 
  loginUser, 
  registerUser, 
  attemptAutoLogin, 
  logout as authLogout,
  getAuthToken,
  getCurrentUser
} from '../../lib/auth';
import { initializeDatabase, getDatabaseStats, isUsingWebFallback } from '../../lib/database';
import { initializeStorage } from '../../lib/storage';
import { Platform } from 'react-native';

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for existing session on app start using SQLite validation
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // CRITICAL: Initialize storage BEFORE any auth operations
      console.log('AuthProvider: Initializing storage...');

      if (Platform.OS === 'web') {
        // For web, try database first, fall back to localStorage
        try {
          await initializeDatabase();
          console.log('AuthProvider: Database ready for web');
        } catch (dbError) {
          console.log('AuthProvider: Database failed on web, using localStorage:', getErrorMessage(dbError));
          await initializeStorage();
          console.log('AuthProvider: Storage adapter initialized');
        }
      } else {
        // For mobile, use database
        await initializeDatabase();
        console.log('AuthProvider: Database ready for mobile');
      }

      // Debug: Check storage contents
      if (Platform.OS === 'web') {
        console.log('🌐 WEB STORAGE CHECK:');
        console.log('  - auth_token exists:', !!localStorage.getItem('auth_token'));
        console.log('  - current_user exists:', !!localStorage.getItem('current_user'));
        console.log('  - using web fallback:', isUsingWebFallback());
      }

      // Debug: Get database stats (if database is working)
      try {
        const stats = await getDatabaseStats();
        console.log('📊 DATABASE STATS:', stats);
      } catch (statsError) {
        console.log('📊 DATABASE STATS: Failed to get stats:', getErrorMessage(statsError));
      }

      // Add detailed logging for debugging
      console.log('AuthProvider: Attempting auto-login...');
      const user = await attemptAutoLogin();
      console.log('AuthProvider: Auto-login result:', user ? 'User found' : 'No user');

      if (user) {
        console.log('AuthProvider: User session found and validated:', {
          id: user.id,
          email: user.email,
          firstName: user.firstName
        });
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        console.log('AuthProvider: No valid session found - this is normal for first load or after logout');
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('AuthProvider: Session check error:', getErrorMessage(error));
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Ensure storage is ready before login attempt
      console.log('🔑 LOGIN DEBUG: Initializing storage for login...');

      if (Platform.OS === 'web') {
        try {
          await initializeDatabase();
          console.log('🔑 LOGIN DEBUG: Database ready for web login');
        } catch (dbError) {
          console.log('🔑 LOGIN DEBUG: Database failed, using storage adapter for login');
          await initializeStorage();
        }
      } else {
        await initializeDatabase();
        console.log('🔑 LOGIN DEBUG: Database ready for mobile login');
      }

      console.log('🔑 LOGIN DEBUG: Attempting login for:', credentials.email);
      const result = await loginUser(credentials);
      console.log('🔑 LOGIN DEBUG: Login result:', result);

      if (result.success && result.user) {
        console.log('✅ LOGIN SUCCESS: User authenticated:', {
          id: result.user.id,
          email: result.user.email
        });

        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        });

        return { success: true };
      } else {
        console.log('❌ LOGIN FAILED:', result.error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('💥 LOGIN ERROR:', getErrorMessage(error));
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Ensure storage is ready before registration attempt
      console.log('📝 REGISTRATION DEBUG: Initializing storage for registration...');

      if (Platform.OS === 'web') {
        try {
          await initializeDatabase();
          console.log('📝 REGISTRATION DEBUG: Database ready for web registration');
        } catch (dbError) {
          console.log('📝 REGISTRATION DEBUG: Database failed, using storage adapter for registration');
          await initializeStorage();
        }
      } else {
        await initializeDatabase();
        console.log('📝 REGISTRATION DEBUG: Database ready for mobile registration');
      }

      console.log('📝 REGISTRATION DEBUG: Starting registration for:', credentials.email);
      const result = await registerUser(credentials);
      console.log('📝 REGISTRATION DEBUG: Registration result:', result);

      if (result.success && result.user) {
        console.log('✅ REGISTRATION SUCCESS: User created and authenticated:', {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          createdAt: result.user.createdAt
        });

        // Check what was stored
        setTimeout(async () => {
          try {
            const storedToken = await getAuthToken();
            const storedUser = await getCurrentUser();
            console.log('💾 STORAGE DEBUG: Token saved:', !!storedToken);
            console.log('💾 STORAGE DEBUG: User saved:', !!storedUser);

            if (Platform.OS === 'web') {
              console.log('🌐 WEB STORAGE DEBUG:');
              console.log('  - auth_token:', !!localStorage.getItem('auth_token'));
              console.log('  - current_user:', !!localStorage.getItem('current_user'));
              console.log('  - using web fallback:', isUsingWebFallback());
            }

            // Check database stats (if available)
            try {
              const stats = await getDatabaseStats();
              console.log('📊 POST-REGISTRATION DATABASE STATS:', stats);
            } catch (statsError) {
              console.log('📊 POST-REGISTRATION: Stats unavailable:', getErrorMessage(statsError));
            }
          } catch (debugError) {
            console.error('Debug info gathering failed:', getErrorMessage(debugError));
          }
        }, 100);

        // Auto-login after successful registration
        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        });

        return { success: true };
      } else {
        console.log('❌ REGISTRATION FAILED:', result.error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('💥 REGISTRATION ERROR:', getErrorMessage(error));
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('🚪 LOGOUT DEBUG: Starting logout process...');
      await authLogout();

      console.log('✅ LOGOUT SUCCESS: User logged out');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('💥 LOGOUT ERROR:', getErrorMessage(error));
      // Still logout on error to avoid stuck state
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  // Helper to get current user (useful for components)
  const getCurrentUserHelper = (): User | null => {
    return authState.user;
  };

  return (
    <AuthContext.Provider value={{ 
      authState, 
      login, 
      register, 
      logout,
      user: authState.user // Add direct user access
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
