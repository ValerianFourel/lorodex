// components/auth/AuthProvider.tsx - Fixed version with proper initialization

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, AuthState, LoginCredentials, RegisterCredentials, User } from '../../types/auth';
import { 
  loginUser, 
  registerUser, 
  attemptAutoLogin, 
  logout as authLogout,
  getAuthToken,
  getCurrentUser,
  removeAuthToken
} from '../../lib/auth';
import { 
  checkConnection, 
  initializeDatabase, 
  getUserStats,
  getTableCounts,
  cleanupExpiredSessions,
  deactivateAllUserSessions
} from '../../lib/database-adapter';
import { Platform } from 'react-native';

console.log('🚀 AuthProvider.tsx: File loaded, imports successful');

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  console.log('🔍 getErrorMessage called with:', typeof error, error);
  if (error instanceof Error) {
    console.log('🔍 getErrorMessage: Error instance, message:', error.message);
    return error.message;
  }
  const stringError = String(error);
  console.log('🔍 getErrorMessage: Non-Error instance, converted to string:', stringError);
  return stringError;
};

console.log('🚀 AuthProvider.tsx: Creating AuthContext...');
const AuthContext = createContext<AuthContextType | undefined>(undefined);
console.log('🚀 AuthProvider.tsx: AuthContext created successfully');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🚀 AuthProvider: Component function called');
  console.log('🚀 AuthProvider: Platform.OS =', Platform.OS);

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  console.log('🚀 AuthProvider: Initial authState set:', authState);

  const checkExistingSession = async () => {
    console.log('🔄 checkExistingSession: Starting...');
    try {
      console.log('🔄 checkExistingSession: Setting isLoading to true');
      setAuthState(prev => {
        console.log('🔄 checkExistingSession: Previous state:', prev);
        const newState = { ...prev, isLoading: true };
        console.log('🔄 checkExistingSession: New state:', newState);
        return newState;
      });

      console.log('🔄 checkExistingSession: Initializing database connection...');

      // Initialize database connection
      try {
        console.log('🔄 checkExistingSession: Calling initializeDatabase()...');
        await initializeDatabase();
        console.log('✅ checkExistingSession: initializeDatabase() completed');

        console.log('🔄 checkExistingSession: Calling checkConnection()...');
        const isConnected = await checkConnection();
        console.log('✅ checkExistingSession: checkConnection() result:', isConnected);

        if (!isConnected) {
          console.error('❌ checkExistingSession: Database connection failed');
          // For web, continue without throwing error
          if (Platform.OS !== 'web') {
            throw new Error('Database connection failed');
          }
        }

        console.log('✅ checkExistingSession: Database connection established');

        // Clean up expired sessions on startup
        if (isConnected) {
          try {
            console.log('🔄 checkExistingSession: Calling cleanupExpiredSessions()...');
            await cleanupExpiredSessions();
            console.log('✅ checkExistingSession: Expired sessions cleaned up');
          } catch (cleanupError) {
            console.warn('⚠️ checkExistingSession: Session cleanup warning:', getErrorMessage(cleanupError));
          }
        }

      } catch (dbError) {
        console.error('❌ checkExistingSession: Database initialization failed:', getErrorMessage(dbError));

        // For web fallback, continue with localStorage
        if (Platform.OS === 'web') {
          console.log('🌐 checkExistingSession: Continuing with web localStorage fallback');
        } else {
          console.error('❌ checkExistingSession: Re-throwing database error for mobile');
          throw dbError;
        }
      }

      // Debug: Get database statistics (only if connected)
      try {
        console.log('🔄 checkExistingSession: Getting table counts...');
        const tableCounts = await getTableCounts();
        console.log('📊 DATABASE TABLE COUNTS:', tableCounts);
      } catch (statsError) {
        console.log('⚠️ DATABASE STATS: Failed to get table counts:', getErrorMessage(statsError));
      }

      // Attempt auto-login with session validation
      console.log('🔄 checkExistingSession: Attempting auto-login with session validation...');
      const user = await attemptAutoLogin();
      console.log('✅ checkExistingSession: Auto-login result:', user ? 'User session validated' : 'No valid session');

      if (user) {
        console.log('✅ checkExistingSession: User session found and validated:', {
          id: user.id,
          email: user.email,
          firstName: user.firstName
        });

        // Get user statistics for debugging (only if we have database connection)
        try {
          console.log('🔄 checkExistingSession: Getting user stats...');
          const userStats = await getUserStats(user.id);
          console.log('📊 checkExistingSession: User stats:', userStats);
        } catch (statsError) {
          console.log('⚠️ checkExistingSession: Could not get user stats:', getErrorMessage(statsError));
        }

        console.log('🔄 checkExistingSession: Setting authenticated state...');
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
        console.log('✅ checkExistingSession: Authenticated state set');
      } else {
        console.log('ℹ️ checkExistingSession: No valid session found - user needs to login');
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        console.log('✅ checkExistingSession: Unauthenticated state set');
      }
    } catch (error) {
      console.error('❌ checkExistingSession: Session check error:', getErrorMessage(error));
      console.error('❌ checkExistingSession: Error stack:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      console.log('✅ checkExistingSession: Error state set');
    }
    console.log('🏁 checkExistingSession: Function completed');
  };

  // Check for existing session on app start
  useEffect(() => {
    console.log('🚀 AuthProvider: useEffect triggered, calling checkExistingSession');
    console.log('🚀 AuthProvider: Current authState before checkExistingSession:', authState);

    // Add a small delay to ensure everything is properly initialized
    const initializeAuth = async () => {
      console.log('🚀 AuthProvider: Starting auth initialization...');
      await checkExistingSession();
      console.log('🚀 AuthProvider: Auth initialization completed');
    };

    initializeAuth();
  }, []); // Empty dependency array to run only once on mount

  // Add a separate useEffect to log state changes
  useEffect(() => {
    console.log('🔄 AuthProvider: AuthState changed:', authState);
  }, [authState]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    console.log('🔐 login: Starting login process for:', credentials.email);
    setAuthState(prev => {
      console.log('🔐 login: Previous state:', prev);
      const newState = { ...prev, isLoading: true };
      console.log('🔐 login: Setting loading state:', newState);
      return newState;
    });

    try {
      // Ensure database connection is ready
      console.log('🔐 login: Verifying database connection...');

      const isConnected = await checkConnection();
      console.log('🔐 login: Connection check result:', isConnected);

      // For web, we can proceed even without database connection
      if (!isConnected && Platform.OS !== 'web') {
        console.error('❌ login: Database connection not available');
        throw new Error('Database connection not available');
      }

      console.log('✅ login: Database connection verified (or web fallback)');
      console.log('🔐 login: Attempting login for:', credentials.email);

      const result = await loginUser(credentials);
      console.log('🔐 login: Login result received:', result.success ? 'SUCCESS' : 'FAILED');
      console.log('🔐 login: Full result object:', result);

      if (result.success && result.user) {
        console.log('✅ LOGIN SUCCESS: User authenticated:', {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName
        });

        // Get user statistics after successful login (only if database connected)
        if (isConnected) {
          try {
            console.log('🔐 login: Getting user stats...');
            const userStats = await getUserStats(result.user.id);
            console.log('📊 LOGIN SUCCESS: User stats:', userStats);
          } catch (statsError) {
            console.log('⚠️ LOGIN: Could not get user stats:', getErrorMessage(statsError));
          }
        }

        console.log('🔐 login: Setting authenticated state...');
        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        });
        console.log('✅ login: Authenticated state set');

        return { success: true };
      } else {
        console.log('❌ LOGIN FAILED:', result.error);
        setAuthState(prev => {
          const newState = { ...prev, isLoading: false };
          console.log('🔐 login: Setting failed state:', newState);
          return newState;
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ LOGIN ERROR:', getErrorMessage(error));
      console.error('❌ LOGIN ERROR stack:', error);
      setAuthState(prev => {
        const newState = { ...prev, isLoading: false };
        console.log('🔐 login: Setting error state:', newState);
        return newState;
      });

      // Provide more specific error messages
      const errorMessage = error instanceof Error && error.message.includes('Database connection') 
        ? 'Database connection failed. Please check your connection and try again.'
        : 'Login failed. Please check your credentials and try again.';

      console.log('🔐 login: Returning error message:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<{ success: boolean; error?: string }> => {
    console.log('📝 register: Starting registration process for:', credentials.email);
    setAuthState(prev => {
      console.log('📝 register: Previous state:', prev);
      const newState = { ...prev, isLoading: true };
      console.log('📝 register: Setting loading state:', newState);
      return newState;
    });

    try {
      // Ensure database connection is ready
      console.log('📝 register: Verifying database connection...');

      const isConnected = await checkConnection();
      console.log('📝 register: Connection check result:', isConnected);

      // For web, we can proceed even without database connection
      if (!isConnected && Platform.OS !== 'web') {
        console.error('❌ register: Database connection not available');
        throw new Error('Database connection not available');
      }

      console.log('✅ register: Database connection verified (or web fallback)');
      console.log('📝 register: Starting registration for:', credentials.email);

      const result = await registerUser(credentials);
      console.log('📝 register: Registration result received:', result.success ? 'SUCCESS' : 'FAILED');
      console.log('📝 register: Full result object:', result);

      if (result.success && result.user) {
        console.log('✅ REGISTRATION SUCCESS: User created and authenticated:', {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          createdAt: result.user.createdAt
        });

        // Verify data persistence
        setTimeout(async () => {
          console.log('📝 register: Starting post-registration verification...');
          try {
            const storedToken = await getAuthToken();
            const storedUser = await getCurrentUser();
            console.log('💾 STORAGE DEBUG: Token saved:', !!storedToken);
            console.log('💾 STORAGE DEBUG: User saved:', !!storedUser);

            // Get updated table counts after registration (only if connected)
            if (isConnected) {
              const tableCounts = await getTableCounts();
              console.log('📊 POST-REGISTRATION TABLE COUNTS:', tableCounts);

              // Get user statistics
              if (result.user) {
                const userStats = await getUserStats(result.user.id);
                console.log('📊 POST-REGISTRATION USER STATS:', userStats);
              }
            }
          } catch (debugError) {
            console.error('❌ Debug info gathering failed:', getErrorMessage(debugError));
          }
        }, 100);

        // Auto-login after successful registration
        console.log('📝 register: Setting authenticated state...');
        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        });
        console.log('✅ register: Authenticated state set');

        return { success: true };
      } else {
        console.log('❌ REGISTRATION FAILED:', result.error);
        setAuthState(prev => {
          const newState = { ...prev, isLoading: false };
          console.log('📝 register: Setting failed state:', newState);
          return newState;
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ REGISTRATION ERROR:', getErrorMessage(error));
      console.error('❌ REGISTRATION ERROR stack:', error);
      setAuthState(prev => {
        const newState = { ...prev, isLoading: false };
        console.log('📝 register: Setting error state:', newState);
        return newState;
      });

      // Provide more specific error messages
      const errorMessage = error instanceof Error && error.message.includes('Database connection')
        ? 'Database connection failed. Please check your connection and try again.'
        : error instanceof Error && error.message.includes('already exists')
        ? 'An account with this email already exists.'
        : 'Registration failed. Please try again.';

      console.log('📝 register: Returning error message:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🚪 logout: Starting logout process...');
    setAuthState(prev => {
      console.log('🚪 logout: Previous state:', prev);
      const newState = { ...prev, isLoading: true };
      console.log('🚪 logout: Setting loading state:', newState);
      return newState;
    });

    try {
      const currentUser = authState.user;
      console.log('🚪 logout: Current user:', currentUser);

      // If we have a current user, deactivate their sessions in the database
      if (currentUser) {
        try {
          console.log('🚪 logout: Deactivating user sessions in database...');
          await deactivateAllUserSessions(currentUser.id);
          console.log('✅ logout: User sessions deactivated in database');
        } catch (sessionError) {
          console.warn('⚠️ logout: Could not deactivate sessions in database:', getErrorMessage(sessionError));
        }
      }

      // Clear all auth data from local storage
      console.log('🚪 logout: Clearing local auth tokens...');
      await removeAuthToken();
      console.log('✅ logout: Auth tokens cleared');

      // Call the auth logout function for any additional cleanup
      console.log('🚪 logout: Calling auth logout function...');
      await authLogout();
      console.log('✅ logout: Auth logout function completed');

      // Verify cleanup worked (for web)
      if (Platform.OS === 'web') {
        console.log('🌐 logout: Verifying web storage cleared...');
        console.log('  - auth_token exists:', !!localStorage.getItem('auth_token'));
        console.log('  - current_user exists:', !!localStorage.getItem('current_user'));
      }

      console.log('✅ LOGOUT SUCCESS: All auth data cleared');

      // Update auth state to logged out
      console.log('🚪 logout: Setting logged out state...');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      console.log('✅ logout: Logged out state set');

    } catch (error) {
      console.error('❌ LOGOUT ERROR:', getErrorMessage(error));
      console.error('❌ LOGOUT ERROR stack:', error);

      // Still logout on error to avoid stuck state
      console.log('🚪 logout: Setting error state (still logged out)...');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Force clear storage even if there was an error
      try {
        console.log('🚪 logout: Force clearing storage...');
        await removeAuthToken();
        if (Platform.OS === 'web') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('current_user');
        }
        console.log('✅ logout: Force clear completed');
      } catch (clearError) {
        console.error('❌ Force clear storage error:', getErrorMessage(clearError));
      }
    }
    console.log('🏁 logout: Function completed');
  };

  // Helper to refresh user data from database
  const refreshUser = async (): Promise<void> => {
    console.log('🔄 refreshUser: Starting...');
    if (!authState.user) {
      console.log('ℹ️ refreshUser: No user to refresh');
      return;
    }

    try {
      console.log('🔄 refreshUser: Getting updated user data for:', authState.user.id);
      const { getUserById } = await import('../../lib/database-adapter');
      const updatedUser = await getUserById(authState.user.id);
      console.log('🔄 refreshUser: Updated user data:', updatedUser);

      if (updatedUser) {
        console.log('🔄 refreshUser: Updating auth state...');
        setAuthState(prev => ({
          ...prev,
          user: updatedUser
        }));
        console.log('✅ refreshUser: Auth state updated');
      } else {
        console.log('⚠️ refreshUser: No updated user data found');
      }
    } catch (error) {
      console.error('❌ refreshUser: Failed to refresh user data:', getErrorMessage(error));
      console.error('❌ refreshUser: Error stack:', error);
    }
    console.log('🏁 refreshUser: Function completed');
  };

  // Helper to check database health
  const checkDatabaseHealth = async (): Promise<boolean> => {
    console.log('🏥 checkDatabaseHealth: Starting...');
    try {
      const result = await checkConnection();
      console.log('🏥 checkDatabaseHealth: Result:', result);
      return result;
    } catch (error) {
      console.error('❌ checkDatabaseHealth: Database health check failed:', getErrorMessage(error));
      console.error('❌ checkDatabaseHealth: Error stack:', error);
      return false;
    }
  };

  console.log('🚀 AuthProvider: Creating context provider...');
  return (
    <AuthContext.Provider value={{ 
      authState, 
      login, 
      register, 
      logout,
      user: authState.user,
      refreshUser,
      checkDatabaseHealth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  console.log('🪝 useAuth: Hook called');
  const context = useContext(AuthContext);
  console.log('🪝 useAuth: Context value:', context);
  if (context === undefined) {
    console.error('❌ useAuth: Context is undefined - must be used within AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('✅ useAuth: Returning context');
  return context;
}

// Additional hook for database-specific operations
export function useAuthDatabase() {
  console.log('🪝 useAuthDatabase: Hook called');
  const auth = useAuth();
  console.log('🪝 useAuthDatabase: Auth context:', auth);

  const getUserStatistics = async () => {
    console.log('📊 getUserStatistics: Starting...');
    if (!auth.user) {
      console.log('ℹ️ getUserStatistics: No user available');
      return null;
    }

    try {
      console.log('📊 getUserStatistics: Getting stats for user:', auth.user.id);
      const userStats = await getUserStats(auth.user.id);
      console.log('📊 getUserStatistics: Stats retrieved:', userStats);
      return userStats;
    } catch (error) {
      console.error('❌ getUserStatistics: Failed to get user statistics:', getErrorMessage(error));
      console.error('❌ getUserStatistics: Error stack:', error);
      return null;
    }
  };

  const getDatabaseInfo = async () => {
    console.log('🗄️ getDatabaseInfo: Starting...');
    try {
      console.log('🗄️ getDatabaseInfo: Getting table counts and connection status...');
      const [tableCounts, isConnected] = await Promise.all([
        getTableCounts(),
        checkConnection()
      ]);
      console.log('🗄️ getDatabaseInfo: Table counts:', tableCounts);
      console.log('🗄️ getDatabaseInfo: Connection status:', isConnected);

      const result = {
        tableCounts,
        isConnected,
        timestamp: new Date().toISOString()
      };
      console.log('🗄️ getDatabaseInfo: Final result:', result);
      return result;
    } catch (error) {
      console.error('❌ getDatabaseInfo: Failed to get database info:', getErrorMessage(error));
      console.error('❌ getDatabaseInfo: Error stack:', error);
      return null;
    }
  };

  console.log('🪝 useAuthDatabase: Returning enhanced auth object');
  return {
    ...auth,
    getUserStatistics,
    getDatabaseInfo
  };
}

console.log('🚀 AuthProvider.tsx: File fully loaded and exported');
