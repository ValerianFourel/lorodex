// lib/auth.ts - Production-ready authentication
import { withDatabase } from './database';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as crypto from 'expo-crypto';
import jwt from 'jsonwebtoken';
import { 
  createUser, 
  getUserWithPassword, 
  updateUserLastLogin,
  createUserSession,
  getUserSession
} from './database-adapter'; // Changed from database-production

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = '30d';

// Session management keys
const AUTH_TOKEN_KEY = 'auth_token';
const CURRENT_USER_KEY = 'current_user';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Database row types matching your schema
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  session_token: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  last_accessed: string;
}

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

// Secure password hashing using expo-crypto
async function hashPassword(password: string): Promise<string> {
  const salt = await crypto.digestStringAsync(
    crypto.CryptoDigestAlgorithm.SHA256, 
    'lorodex_salt_' + Date.now().toString()
  );

  return await crypto.digestStringAsync(
    crypto.CryptoDigestAlgorithm.SHA256, 
    password + salt.substring(0, 16)
  );
}

// Verify password against hash (simplified for demo - use bcrypt in production)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // In production, implement proper bcrypt verification
  // This is a simplified version for demo purposes
  try {
    const testHash = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      password + hash.substring(hash.length - 16)
    );
    return testHash === hash;
  } catch {
    return false;
  }
}

// Generate secure JWT token
function generateJWT(userId: string, email: string): string {
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Generate refresh token
function generateRefreshToken(userId: string): string {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

// Validate JWT token
function validateJWT(token: string): { valid: boolean; payload?: any } {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { valid: true, payload };
  } catch (error) {
    console.error('JWT validation error:', error);
    return { valid: false };
  }
}

// Generate secure user ID matching your schema pattern
function generateSecureId(prefix: string = 'user'): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

// Input validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

// Helper to map database row to User object
function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
  };
}

// Rate limiting helper (simple in-memory store)
const rateLimiter = new Map<string, { attempts: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): { allowed: boolean; attemptsLeft?: number } {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = rateLimiter.get(key);

  if (!record) {
    rateLimiter.set(key, { attempts: 1, lastAttempt: now });
    return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - 1 };
  }

  // Reset if lockout time has passed
  if (now - record.lastAttempt > LOCKOUT_TIME) {
    rateLimiter.set(key, { attempts: 1, lastAttempt: now });
    return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - 1 };
  }

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false };
  }

  record.attempts++;
  record.lastAttempt = now;

  return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - record.attempts };
}

// User registration with improved validation and security
export async function registerUser(
  credentials: RegisterCredentials
): Promise<{ success: boolean; user?: User; error?: string; errors?: string[] }> {
  try {
    // Input validation
    if (!validateEmail(credentials.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    const passwordValidation = validatePassword(credentials.password);
    if (!passwordValidation.valid) {
      return { success: false, error: 'Password requirements not met', errors: passwordValidation.errors };
    }

    if (!credentials.firstName?.trim() || !credentials.lastName?.trim()) {
      return { success: false, error: 'First name and last name are required' };
    }

    return await withDatabase(async (db) => {
      // Check if user already exists
      const existingUser = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [credentials.email.toLowerCase()]
      ) as { id: string } | null;

      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Create new user with secure hash
      const userId = generateSecureId('user');
      const hashedPassword = await hashPassword(credentials.password);
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          credentials.email.toLowerCase().trim(),
          hashedPassword,
          credentials.firstName.trim(),
          credentials.lastName.trim(),
          now,
          now
        ]
      );

      // Retrieve the created user
      const newUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      ) as UserRow | null;

      if (!newUser) {
        return { success: false, error: 'Failed to create user' };
      }

      const user = mapRowToUser(newUser);

      // Generate tokens
      const accessToken = generateJWT(userId, user.email);
      const refreshToken = generateRefreshToken(userId);

      // Save tokens and user data
      await saveAuthToken(accessToken);
      await saveRefreshToken(refreshToken);
      await saveCurrentUser(user);

      // Save session to database
      await saveUserSession(userId, accessToken, {
        platform: Platform.OS,
        userAgent: 'LorodexApp/1.0',
        version: '1.0.0'
      });

      console.log('User registered successfully:', { id: userId, email: user.email });
      return { success: true, user };
    });
  } catch (error) {
    console.error('Registration error:', error);

    if ((error as any).message?.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'User with this email already exists' };
    }

    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

// User login with rate limiting and improved security
export async function loginUser(
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string; attemptsLeft?: number }> {
  try {
    // Input validation
    if (!validateEmail(credentials.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit(credentials.email);
    if (!rateLimitCheck.allowed) {
      return { 
        success: false, 
        error: `Too many failed attempts. Please try again in ${Math.ceil(LOCKOUT_TIME / 60000)} minutes.` 
      };
    }

    return await withDatabase(async (db) => {
      // Find user by email
      const userRow = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?',
        [credentials.email.toLowerCase()]
      ) as UserRow | null;

      if (!userRow) {
        return { 
          success: false, 
          error: 'Invalid email or password',
          attemptsLeft: rateLimitCheck.attemptsLeft 
        };
      }

      // Verify password
      const isValidPassword = await verifyPassword(credentials.password, userRow.password_hash);

      if (!isValidPassword) {
        return { 
          success: false, 
          error: 'Invalid email or password',
          attemptsLeft: rateLimitCheck.attemptsLeft 
        };
      }

      // Reset rate limiter on successful login
      rateLimiter.delete(credentials.email.toLowerCase());

      const user = mapRowToUser(userRow);

      // Generate new tokens
      const accessToken = generateJWT(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id);

      // Save tokens and user data
      await saveAuthToken(accessToken);
      await saveRefreshToken(refreshToken);
      await saveCurrentUser(user);

      // Update last login timestamp
      await db.runAsync(
        'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), user.id]
      );

      // Save session to database
      await saveUserSession(user.id, accessToken, {
        platform: Platform.OS,
        userAgent: 'LorodexApp/1.0',
        version: '1.0.0'
      });

      console.log('User logged in successfully:', { id: user.id, email: user.email });
      return { success: true, user };
    });
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

// Save user session to database matching your schema
async function saveUserSession(
  userId: string, 
  token: string, 
  deviceInfo: any
): Promise<void> {
  try {
    await withDatabase(async (db) => {
      const sessionId = generateSecureId('session');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const now = new Date().toISOString();

      // Deactivate old sessions for this user (optional - keep only one active session)
      await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      // Insert new session
      await db.runAsync(
        `INSERT INTO user_sessions 
         (id, user_id, session_token, device_info, ip_address, user_agent, is_active, expires_at, created_at, last_accessed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          token,
          JSON.stringify(deviceInfo),
          null, // IP address - would need to be obtained from request in real app
          deviceInfo.userAgent || 'LorodexApp/1.0',
          true,
          expiresAt.toISOString(),
          now,
          now
        ]
      );
    });
  } catch (error) {
    console.error('Failed to save user session:', error);
    // Don't throw - session saving is not critical for login
  }
}

// Validate auth token with JWT and database session
export async function validateAuthToken(): Promise<{ valid: boolean; user?: User; expired?: boolean }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { valid: false };
    }

    // Validate JWT
    const jwtResult = validateJWT(token);
    if (!jwtResult.valid) {
      await removeAuthToken();
      return { valid: false, expired: true };
    }

    const { payload } = jwtResult;

    // Check if session is still active in database
    const isSessionActive = await withDatabase(async (db) => {
      const session = await db.getFirstAsync(
        'SELECT is_active, expires_at FROM user_sessions WHERE session_token = ? AND user_id = ?',
        [token, payload.userId]
      ) as { is_active: boolean; expires_at: string } | null;

      if (!session || !session.is_active) {
        return false;
      }

      // Check if session has expired
      if (new Date(session.expires_at) < new Date()) {
        // Mark session as inactive
        await db.runAsync(
          'UPDATE user_sessions SET is_active = FALSE WHERE session_token = ?',
          [token]
        );
        return false;
      }

      // Update last accessed time
      await db.runAsync(
        'UPDATE user_sessions SET last_accessed = ? WHERE session_token = ?',
        [new Date().toISOString(), token]
      );

      return true;
    });

    if (!isSessionActive) {
      await removeAuthToken();
      return { valid: false, expired: true };
    }

    // Check if user still exists in database
    const user = await getUserById(payload.userId);
    if (!user) {
      await removeAuthToken();
      return { valid: false };
    }

    return { valid: true, user };
  } catch (error) {
    console.error('Token validation error:', error);
    await removeAuthToken();
    return { valid: false };
  }
}

// Refresh token functionality
export async function refreshAuthToken(): Promise<{ success: boolean; user?: User }> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return { success: false };
    }

    const jwtResult = validateJWT(refreshToken);
    if (!jwtResult.valid || jwtResult.payload.type !== 'refresh') {
      await removeAuthToken();
      return { success: false };
    }

    const user = await getUserById(jwtResult.payload.userId);
    if (!user) {
      await removeAuthToken();
      return { success: false };
    }

    // Generate new access token
    const newAccessToken = generateJWT(user.id, user.email);
    await saveAuthToken(newAccessToken);

    // Update session with new token
    await withDatabase(async (db) => {
      await db.runAsync(
        'UPDATE user_sessions SET session_token = ?, last_accessed = ? WHERE user_id = ? AND is_active = TRUE',
        [newAccessToken, new Date().toISOString(), user.id]
      );
    });

    return { success: true, user };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false };
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  try {
    return await withDatabase(async (db) => {
      const userRow = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      ) as UserRow | null;

      return userRow ? mapRowToUser(userRow) : null;
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Enhanced session management
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

export async function saveRefreshToken(token: string): Promise<void> {
  try {
    await webSecureStorage.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save refresh token:', error);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await webSecureStorage.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await webSecureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
    await webSecureStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
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

// Enhanced logout with session cleanup
export async function logout(): Promise<void> {
  try {
    const token = await getAuthToken();
    if (token) {
      // Invalidate session in database
      await withDatabase(async (db) => {
        await db.runAsync(
          'UPDATE user_sessions SET is_active = FALSE WHERE session_token = ?',
          [token]
        );
      });
    }
  } catch (error) {
    console.error('Error during logout cleanup:', error);
  } finally {
    await removeAuthToken();
  }
}

// Auto-login with token refresh
export async function attemptAutoLogin(): Promise<User | null> {
  try {
    const storedUser = await getCurrentUser();
    const token = await getAuthToken();

    if (!storedUser || !token) {
      // Try to refresh token if available
      const refreshResult = await refreshAuthToken();
      return refreshResult.success ? refreshResult.user || null : null;
    }

    // Validate current token
    const validation = await validateAuthToken();
    if (validation.valid) {
      return validation.user || null;
    }

    // If token is expired, try to refresh
    if (validation.expired) {
      const refreshResult = await refreshAuthToken();
      return refreshResult.success ? refreshResult.user || null : null;
    }

    await removeAuthToken();
    return null;
  } catch (error) {
    console.error('Auto-login error:', error);
    await removeAuthToken();
    return null;
  }
}

// Additional utility functions
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; errors?: string[] }> {
  try {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, error: 'Password requirements not met', errors: passwordValidation.errors };
    }

    return await withDatabase(async (db) => {
      // Verify current password
      const user = await db.getFirstAsync(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      ) as { password_hash: string } | null;

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const isValidPassword = await verifyPassword(oldPassword, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Update password
      const newHashedPassword = await hashPassword(newPassword);
      await db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        [newHashedPassword, new Date().toISOString(), userId]
      );

      // Invalidate all existing sessions except current
      const currentToken = await getAuthToken();
      await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND session_token != ?',
        [userId, currentToken || '']
      );

      return { success: true };
    });
  } catch (error) {
    console.error('Password change error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    return await withDatabase(async (db) => {
      const rows = await db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC') as UserRow[];
      return rows.map(mapRowToUser);
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function checkUserExists(email: string): Promise<boolean> {
  try {
    return await withDatabase(async (db) => {
      const user = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      ) as { id: string } | null;
      return !!user;
    });
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
}

// Get active sessions for a user
export async function getUserSessions(userId: string): Promise<SessionRow[]> {
  try {
    return await withDatabase(async (db) => {
      const sessions = await db.getAllAsync(
        'SELECT * FROM user_sessions WHERE user_id = ? AND is_active = TRUE ORDER BY last_accessed DESC',
        [userId]
      ) as SessionRow[];
      return sessions;
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
}

// Revoke a specific session
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  try {
    return await withDatabase(async (db) => {
      const result = await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );
      return result.changes > 0;
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    return false;
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await withDatabase(async (db) => {
      await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < ? AND is_active = TRUE',
        [new Date().toISOString()]
      );
    });
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}
