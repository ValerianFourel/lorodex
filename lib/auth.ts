// lib/auth.ts
import { withDatabase } from './database';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Session management keys
const AUTH_TOKEN_KEY = 'auth_token';
const CURRENT_USER_KEY = 'current_user';

// Web-compatible secure storage
const webSecureStorage = {
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// Generate a simple auth token (in production, use proper JWT)
function generateAuthToken(userId: string): string {
  return `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simple password hashing (in production, use bcrypt or similar)
function hashPassword(password: string): string {
  // For now, we'll use a simple hash. In production, use proper bcrypt
  return `hashed_${password}`;
}

// Helper to map database row to User object
function mapRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
  };
}

// User registration with SQLite
export async function registerUser(credentials: RegisterCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    return await withDatabase(async (db) => {
      // Check if user already exists
      const existingUser = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [credentials.email.toLowerCase()]
      );

      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const hashedPassword = hashPassword(credentials.password);
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          credentials.email.toLowerCase(),
          hashedPassword,
          credentials.firstName,
          credentials.lastName,
          now
        ]
      );

      // Retrieve the created user
      const newUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (!newUser) {
        return { success: false, error: 'Failed to create user' };
      }

      const user = mapRowToUser(newUser);

      // Generate and save auth token
      const token = generateAuthToken(userId);
      await saveAuthToken(token);
      await saveCurrentUser(user);

      return { success: true, user };
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific SQLite errors
    if ((error as any).message?.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'User with this email already exists' };
    }

    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

// User login with SQLite
export async function loginUser(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    return await withDatabase(async (db) => {
      const hashedPassword = hashPassword(credentials.password);

      // Find user with matching email and password
      const userRow = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ? AND password_hash = ?',
        [credentials.email.toLowerCase(), hashedPassword]
      );

      if (!userRow) {
        return { success: false, error: 'Invalid email or password' };
      }

      const user = mapRowToUser(userRow);

      // Generate and save auth token
      const token = generateAuthToken(user.id);
      await saveAuthToken(token);
      await saveCurrentUser(user);

      return { success: true, user };
    });
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

// Get user by ID (useful for token validation)
export async function getUserById(userId: string): Promise<User | null> {
  try {
    return await withDatabase(async (db) => {
      const userRow = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      return userRow ? mapRowToUser(userRow) : null;
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Validate auth token and get user
export async function validateAuthToken(): Promise<{ valid: boolean; user?: User }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { valid: false };
    }

    // Extract user ID from token (simple implementation)
    const userId = token.split('_')[0];
    if (!userId) {
      return { valid: false };
    }

    // Check if user still exists in database
    const user = await getUserById(userId);
    if (!user) {
      // User was deleted, clear invalid token
      await removeAuthToken();
      return { valid: false };
    }

    return { valid: true, user };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false };
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string, 
  updates: { firstName?: string; lastName?: string; email?: string }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    return await withDatabase(async (db) => {
      const setClause = [];
      const values = [];

      // Build dynamic update query
      if (updates.firstName !== undefined) {
        setClause.push('first_name = ?');
        values.push(updates.firstName);
      }
      if (updates.lastName !== undefined) {
        setClause.push('last_name = ?');
        values.push(updates.lastName);
      }
      if (updates.email !== undefined) {
        setClause.push('email = ?');
        values.push(updates.email.toLowerCase());
      }

      if (setClause.length === 0) {
        return { success: false, error: 'No updates provided' };
      }

      values.push(userId);

      // Check if new email already exists (if email is being updated)
      if (updates.email) {
        const existingUser = await db.getFirstAsync(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [updates.email.toLowerCase(), userId]
        );

        if (existingUser) {
          return { success: false, error: 'Email already in use' };
        }
      }

      // Update user
      await db.runAsync(
        `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
        values
      );

      // Fetch updated user
      const updatedUser = await getUserById(userId);
      if (!updatedUser) {
        return { success: false, error: 'Failed to update user' };
      }

      // Update stored user data
      await saveCurrentUser(updatedUser);

      return { success: true, user: updatedUser };
    });
  } catch (error) {
    console.error('Profile update error:', error);

    if ((error as any).message?.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Email already in use' };
    }

    return { success: false, error: 'Failed to update profile' };
  }
}

// Change password
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await withDatabase(async (db) => {
      const oldHashedPassword = hashPassword(oldPassword);

      // Verify current password
      const user = await db.getFirstAsync(
        'SELECT id FROM users WHERE id = ? AND password_hash = ?',
        [userId, oldHashedPassword]
      );

      if (!user) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Update password
      const newHashedPassword = hashPassword(newPassword);
      await db.runAsync(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHashedPassword, userId]
      );

      return { success: true };
    });
  } catch (error) {
    console.error('Password change error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

// Delete user account (cascade delete will remove business cards)
export async function deleteUserAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await withDatabase(async (db) => {
      const result = await db.runAsync(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      if (result.changes === 0) {
        return { success: false, error: 'User not found' };
      }

      // Clear local session
      await removeAuthToken();

      return { success: true };
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return { success: false, error: 'Failed to delete account' };
  }
}

// Session management (web-compatible storage)
export async function saveAuthToken(token: string): Promise<void> {
  try {
    await webSecureStorage.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await webSecureStorage.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await webSecureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
    await webSecureStorage.deleteItemAsync(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Failed to remove auth tokens:', error);
  }
}

export async function saveCurrentUser(user: User): Promise<void> {
  try {
    await webSecureStorage.setItemAsync(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save current user:', error);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const userJson = await webSecureStorage.getItemAsync(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

// Logout helper
export async function logout(): Promise<void> {
  await removeAuthToken();
}

// Auto-login helper (checks if stored session is still valid)
export async function attemptAutoLogin(): Promise<User | null> {
  try {
    const storedUser = await getCurrentUser();
    const token = await getAuthToken();

    if (!storedUser || !token) {
      return null;
    }

    // Validate that user still exists in database
    const validation = await validateAuthToken();
    if (!validation.valid) {
      await removeAuthToken();
      return null;
    }

    return validation.user || null;
  } catch (error) {
    console.error('Auto-login error:', error);
    await removeAuthToken();
    return null;
  }
}

// Add this function to lib/auth.ts for testing purposes
export async function getAllUsers(): Promise<User[]> {
  try {
    return await withDatabase(async (db) => {
      const rows = await db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC');
      return rows.map(mapRowToUser);
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

// Add this function to check if a specific user exists
export async function checkUserExists(email: string): Promise<boolean> {
  try {
    return await withDatabase(async (db) => {
      const user = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );
      return !!user;
    });
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
}
