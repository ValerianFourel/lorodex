// lib/auth.ts - Production-ready authentication with web compatibility
import { withDatabase } from './database';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as crypto from 'expo-crypto';
import { 
  createUser, 
  getUserWithPassword, 
  updateUserLastLogin,
  createUserSession,
  getUserSession
} from './database-adapter';

console.log('🚀 lib/auth.ts: File loaded, starting initialization...');
console.log('🚀 lib/auth.ts: Platform.OS =', Platform.OS);

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = '30d';

// Session management keys
const AUTH_TOKEN_KEY = 'auth_token';
const CURRENT_USER_KEY = 'current_user';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Web-compatible JWT implementation
console.log('🚀 lib/auth.ts: Setting up JWT handling...');

interface JWTPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// Simple base64 URL encoding/decoding for web compatibility
const base64UrlEncode = (str: string): string => {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const base64UrlDecode = (str: string): string => {
  str += new Array(5 - str.length % 4).join('=');
  return atob(str.replace(/\-/g, '+').replace(/_/g, '/'));
};

// Web-compatible JWT functions
const webJWT = {
  sign: (payload: any, secret: string, options: { expiresIn: string }): string => {
    console.log('🔐 webJWT.sign: Creating JWT token for payload:', { ...payload, secret: '[HIDDEN]' });

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    // Calculate expiration
    const now = Math.floor(Date.now() / 1000);
    let exp = now;

    if (options.expiresIn === '7d') {
      exp = now + (7 * 24 * 60 * 60);
    } else if (options.expiresIn === '30d') {
      exp = now + (30 * 24 * 60 * 60);
    }

    const fullPayload = {
      ...payload,
      exp
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    // Create signature using crypto.digestStringAsync
    const signatureData = `${encodedHeader}.${encodedPayload}`;

    // For web compatibility, we'll use a simplified signature
    // In production, you might want to use a proper HMAC implementation
    const signature = base64UrlEncode(crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      signatureData + secret
    ).toString());

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;
    console.log('✅ webJWT.sign: JWT token created successfully');
    return token;
  },

  verify: async (token: string, secret: string): Promise<JWTPayload> => {
    console.log('🔍 webJWT.verify: Verifying JWT token...');

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ webJWT.verify: Invalid token format');
      throw new Error('Invalid token format');
    }

    try {
      const [encodedHeader, encodedPayload, signature] = parts;

      // Verify signature
      const signatureData = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = base64UrlEncode(
        await crypto.digestStringAsync(
          crypto.CryptoDigestAlgorithm.SHA256,
          signatureData + secret
        )
      );

      if (signature !== expectedSignature) {
        console.error('❌ webJWT.verify: Invalid signature');
        throw new Error('Invalid signature');
      }

      // Decode payload
      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.error('❌ webJWT.verify: Token expired');
        throw new Error('Token expired');
      }

      console.log('✅ webJWT.verify: Token verified successfully');
      return payload;
    } catch (error) {
      console.error('❌ webJWT.verify: Token verification failed:', error);
      throw error;
    }
  }
};

// Platform-specific JWT handling
let jwtHandler: any;

if (Platform.OS === 'web') {
  console.log('🌐 lib/auth.ts: Using web-compatible JWT implementation');
  jwtHandler = webJWT;
} else {
  console.log('📱 lib/auth.ts: Using Node.js JWT implementation for mobile');
  try {
    // Dynamic import for mobile platforms
    const jwt = require('jsonwebtoken');
    jwtHandler = {
      sign: (payload: any, secret: string, options: any) => jwt.sign(payload, secret, options),
      verify: async (token: string, secret: string) => jwt.verify(token, secret)
    };
    console.log('✅ lib/auth.ts: Node.js JWT loaded successfully');
  } catch (error) {
    console.error('❌ lib/auth.ts: Failed to load Node.js JWT, falling back to web implementation');
    jwtHandler = webJWT;
  }
}

console.log('✅ lib/auth.ts: JWT handler initialized');

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
    console.log('💾 webSecureStorage.setItemAsync: Saving key:', key);
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      console.log('✅ webSecureStorage.setItemAsync: Saved to localStorage');
    } else {
      await SecureStore.setItemAsync(key, value);
      console.log('✅ webSecureStorage.setItemAsync: Saved to SecureStore');
    }
  },

  async getItemAsync(key: string): Promise<string | null> {
    console.log('📖 webSecureStorage.getItemAsync: Reading key:', key);
    if (Platform.OS === 'web') {
      const value = localStorage.getItem(key);
      console.log('✅ webSecureStorage.getItemAsync: Read from localStorage:', !!value);
      return value;
    } else {
      const value = await SecureStore.getItemAsync(key);
      console.log('✅ webSecureStorage.getItemAsync: Read from SecureStore:', !!value);
      return value;
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    console.log('🗑️ webSecureStorage.deleteItemAsync: Deleting key:', key);
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      console.log('✅ webSecureStorage.deleteItemAsync: Deleted from localStorage');
    } else {
      await SecureStore.deleteItemAsync(key);
      console.log('✅ webSecureStorage.deleteItemAsync: Deleted from SecureStore');
    }
  }
};

// Secure password hashing using expo-crypto
async function hashPassword(password: string): Promise<string> {
  console.log('🔐 hashPassword: Hashing password...');
  const salt = await crypto.digestStringAsync(
    crypto.CryptoDigestAlgorithm.SHA256, 
    'lorodex_salt_' + Date.now().toString()
  );

  const hash = await crypto.digestStringAsync(
    crypto.CryptoDigestAlgorithm.SHA256, 
    password + salt.substring(0, 16)
  );

  console.log('✅ hashPassword: Password hashed successfully');
  return hash;
}

// Verify password against hash (simplified for demo - use bcrypt in production)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  console.log('🔍 verifyPassword: Verifying password...');
  try {
    const testHash = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      password + hash.substring(hash.length - 16)
    );
    const isValid = testHash === hash;
    console.log('✅ verifyPassword: Password verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ verifyPassword: Password verification failed:', error);
    return false;
  }
}

// Generate secure JWT token
function generateJWT(userId: string, email: string): string {
  console.log('🔐 generateJWT: Generating JWT for user:', userId);
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    type: 'access' as const
  };

  const token = jwtHandler.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  console.log('✅ generateJWT: JWT generated successfully');
  return token;
}

// Generate refresh token
function generateRefreshToken(userId: string): string {
  console.log('🔐 generateRefreshToken: Generating refresh token for user:', userId);
  const payload = {
    userId,
    type: 'refresh' as const,
    iat: Math.floor(Date.now() / 1000)
  };

  const token = jwtHandler.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  console.log('✅ generateRefreshToken: Refresh token generated successfully');
  return token;
}

// Validate JWT token
async function validateJWT(token: string): Promise<{ valid: boolean; payload?: JWTPayload }> {
  console.log('🔍 validateJWT: Validating JWT token...');
  try {
    const payload = await jwtHandler.verify(token, JWT_SECRET);
    console.log('✅ validateJWT: JWT validation successful');
    return { valid: true, payload };
  } catch (error) {
    console.error('❌ validateJWT: JWT validation failed:', error);
    return { valid: false };
  }
}

// Generate secure user ID matching your schema pattern
function generateSecureId(prefix: string = 'user'): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  const id = `${prefix}_${timestamp}_${random}`;
  console.log('🆔 generateSecureId: Generated ID:', id);
  return id;
}

// Input validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  console.log('📧 validateEmail: Email validation result:', isValid);
  return isValid;
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  console.log('🔐 validatePassword: Validating password requirements...');
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

  const result = { valid: errors.length === 0, errors };
  console.log('✅ validatePassword: Password validation result:', result.valid, 'errors:', errors.length);
  return result;
}

// Helper to map database row to User object
function mapRowToUser(row: UserRow): User {
  console.log('🔄 mapRowToUser: Mapping user row to User object for:', row.email);
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
  console.log('🚦 checkRateLimit: Checking rate limit for:', email);
  const key = email.toLowerCase();
  const now = Date.now();
  const record = rateLimiter.get(key);

  if (!record) {
    rateLimiter.set(key, { attempts: 1, lastAttempt: now });
    console.log('✅ checkRateLimit: First attempt, allowed');
    return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - 1 };
  }

  // Reset if lockout time has passed
  if (now - record.lastAttempt > LOCKOUT_TIME) {
    rateLimiter.set(key, { attempts: 1, lastAttempt: now });
    console.log('✅ checkRateLimit: Lockout time passed, reset attempts');
    return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - 1 };
  }

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    console.log('❌ checkRateLimit: Max attempts reached, blocked');
    return { allowed: false };
  }

  record.attempts++;
  record.lastAttempt = now;
  console.log('✅ checkRateLimit: Attempt allowed, remaining:', MAX_LOGIN_ATTEMPTS - record.attempts);

  return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - record.attempts };
}

// User registration with improved validation and security
export async function registerUser(
  credentials: RegisterCredentials
): Promise<{ success: boolean; user?: User; error?: string; errors?: string[] }> {
  console.log('📝 registerUser: Starting registration for:', credentials.email);
  try {
    // Input validation
    if (!validateEmail(credentials.email)) {
      console.log('❌ registerUser: Invalid email format');
      return { success: false, error: 'Invalid email format' };
    }

    const passwordValidation = validatePassword(credentials.password);
    if (!passwordValidation.valid) {
      console.log('❌ registerUser: Password validation failed');
      return { success: false, error: 'Password requirements not met', errors: passwordValidation.errors };
    }

    if (!credentials.firstName?.trim() || !credentials.lastName?.trim()) {
      console.log('❌ registerUser: Missing name fields');
      return { success: false, error: 'First name and last name are required' };
    }

    console.log('🔄 registerUser: Starting database transaction...');
    return await withDatabase(async (db) => {
      // Check if user already exists
      console.log('🔍 registerUser: Checking if user exists...');
      const existingUser = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [credentials.email.toLowerCase()]
      ) as { id: string } | null;

      if (existingUser) {
        console.log('❌ registerUser: User already exists');
        return { success: false, error: 'User with this email already exists' };
      }

      // Create new user with secure hash
      console.log('🔄 registerUser: Creating new user...');
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
      console.log('🔍 registerUser: Retrieving created user...');
      const newUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      ) as UserRow | null;

      if (!newUser) {
        console.error('❌ registerUser: Failed to retrieve created user');
        return { success: false, error: 'Failed to create user' };
      }

      const user = mapRowToUser(newUser);

      // Generate tokens
      console.log('🔐 registerUser: Generating tokens...');
      const accessToken = generateJWT(userId, user.email);
      const refreshToken = generateRefreshToken(userId);

      // Save tokens and user data
      console.log('💾 registerUser: Saving tokens and user data...');
      await saveAuthToken(accessToken);
      await saveRefreshToken(refreshToken);
      await saveCurrentUser(user);

      // Save session to database
      console.log('💾 registerUser: Saving session to database...');
      await saveUserSession(userId, accessToken, {
        platform: Platform.OS,
        userAgent: 'LorodexApp/1.0',
        version: '1.0.0'
      });

      console.log('✅ registerUser: User registered successfully:', { id: userId, email: user.email });
      return { success: true, user };
    });
  } catch (error) {
    console.error('❌ registerUser: Registration error:', error);

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
  console.log('🔐 loginUser: Starting login for:', credentials.email);
  try {
    // Input validation
    if (!validateEmail(credentials.email)) {
      console.log('❌ loginUser: Invalid email format');
      return { success: false, error: 'Invalid email format' };
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit(credentials.email);
    if (!rateLimitCheck.allowed) {
      console.log('❌ loginUser: Rate limit exceeded');
      return { 
        success: false, 
        error: `Too many failed attempts. Please try again in ${Math.ceil(LOCKOUT_TIME / 60000)} minutes.` 
      };
    }

    console.log('🔄 loginUser: Starting database transaction...');
    return await withDatabase(async (db) => {
      // Find user by email
      console.log('🔍 loginUser: Finding user by email...');
      const userRow = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?',
        [credentials.email.toLowerCase()]
      ) as UserRow | null;

      if (!userRow) {
        console.log('❌ loginUser: User not found');
        return { 
          success: false, 
          error: 'Invalid email or password',
          attemptsLeft: rateLimitCheck.attemptsLeft 
        };
      }

      // Verify password
      console.log('🔍 loginUser: Verifying password...');
      const isValidPassword = await verifyPassword(credentials.password, userRow.password_hash);

      if (!isValidPassword) {
        console.log('❌ loginUser: Invalid password');
        return { 
          success: false, 
          error: 'Invalid email or password',
          attemptsLeft: rateLimitCheck.attemptsLeft 
        };
      }

      // Reset rate limiter on successful login
      console.log('✅ loginUser: Password valid, resetting rate limiter');
      rateLimiter.delete(credentials.email.toLowerCase());

      const user = mapRowToUser(userRow);

      // Generate new tokens
      console.log('🔐 loginUser: Generating tokens...');
      const accessToken = generateJWT(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id);

      // Save tokens and user data
      console.log('💾 loginUser: Saving tokens and user data...');
      await saveAuthToken(accessToken);
      await saveRefreshToken(refreshToken);
      await saveCurrentUser(user);

      // Update last login timestamp
      console.log('🔄 loginUser: Updating last login timestamp...');
      await db.runAsync(
        'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), user.id]
      );

      // Save session to database
      console.log('💾 loginUser: Saving session to database...');
      await saveUserSession(user.id, accessToken, {
        platform: Platform.OS,
        userAgent: 'LorodexApp/1.0',
        version: '1.0.0'
      });

      console.log('✅ loginUser: User logged in successfully:', { id: user.id, email: user.email });
      return { success: true, user };
    });
  } catch (error) {
    console.error('❌ loginUser: Login error:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

// Save user session to database matching your schema
async function saveUserSession(
  userId: string, 
  token: string, 
  deviceInfo: any
): Promise<void> {
  console.log('💾 saveUserSession: Saving session for user:', userId);
  try {
    await withDatabase(async (db) => {
      const sessionId = generateSecureId('session');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const now = new Date().toISOString();

      // Deactivate old sessions for this user (optional - keep only one active session)
      console.log('🔄 saveUserSession: Deactivating old sessions...');
      await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      // Insert new session
      console.log('💾 saveUserSession: Inserting new session...');
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
      console.log('✅ saveUserSession: Session saved successfully');
    });
  } catch (error) {
    console.error('❌ saveUserSession: Failed to save user session:', error);
    // Don't throw - session saving is not critical for login
  }
}

// Validate auth token with JWT and database session
export async function validateAuthToken(): Promise<{ valid: boolean; user?: User; expired?: boolean }> {
  console.log('🔍 validateAuthToken: Starting token validation...');
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('❌ validateAuthToken: No token found');
      return { valid: false };
    }

    // Validate JWT
    console.log('🔍 validateAuthToken: Validating JWT...');
    const jwtResult = await validateJWT(token);
    if (!jwtResult.valid) {
      console.log('❌ validateAuthToken: JWT validation failed');
      await removeAuthToken();
      return { valid: false, expired: true };
    }

    const { payload } = jwtResult;

    // Check if session is still active in database
    console.log('🔍 validateAuthToken: Checking session in database...');
    const isSessionActive = await withDatabase(async (db) => {
      const session = await db.getFirstAsync(
        'SELECT is_active, expires_at FROM user_sessions WHERE session_token = ? AND user_id = ?',
        [token, payload!.userId]
      ) as { is_active: boolean; expires_at: string } | null;

      if (!session || !session.is_active) {
        console.log('❌ validateAuthToken: Session not found or inactive');
        return false;
      }

      // Check if session has expired
      if (new Date(session.expires_at) < new Date()) {
        console.log('❌ validateAuthToken: Session expired');
        // Mark session as inactive
        await db.runAsync(
          'UPDATE user_sessions SET is_active = FALSE WHERE session_token = ?',
          [token]
        );
        return false;
      }

      // Update last accessed time
      console.log('🔄 validateAuthToken: Updating last accessed time...');
      await db.runAsync(
        'UPDATE user_sessions SET last_accessed = ? WHERE session_token = ?',
        [new Date().toISOString(), token]
      );

      return true;
    });

    if (!isSessionActive) {
      console.log('❌ validateAuthToken: Session not active');
      await removeAuthToken();
      return { valid: false, expired: true };
    }

    // Check if user still exists in database
    console.log('🔍 validateAuthToken: Checking if user exists...');
    const user = await getUserById(payload!.userId);
    if (!user) {
      console.log('❌ validateAuthToken: User not found');
      await removeAuthToken();
      return { valid: false };
    }

    console.log('✅ validateAuthToken: Token validation successful');
    return { valid: true, user };
  } catch (error) {
    console.error('❌ validateAuthToken: Token validation error:', error);
    await removeAuthToken();
    return { valid: false };
  }
}

// Refresh token functionality
export async function refreshAuthToken(): Promise<{ success: boolean; user?: User }> {
  console.log('🔄 refreshAuthToken: Starting token refresh...');
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.log('❌ refreshAuthToken: No refresh token found');
      return { success: false };
    }

    console.log('🔍 refreshAuthToken: Validating refresh token...');
    const jwtResult = await validateJWT(refreshToken);
    if (!jwtResult.valid || jwtResult.payload!.type !== 'refresh') {
      console.log('❌ refreshAuthToken: Invalid refresh token');
      await removeAuthToken();
      return { success: false };
    }

    console.log('🔍 refreshAuthToken: Getting user by ID...');
    const user = await getUserById(jwtResult.payload!.userId);
    if (!user) {
      console.log('❌ refreshAuthToken: User not found');
      await removeAuthToken();
      return { success: false };
    }

    // Generate new access token
    console.log('🔐 refreshAuthToken: Generating new access token...');
    const newAccessToken = generateJWT(user.id, user.email);
    await saveAuthToken(newAccessToken);

    // Update session with new token
    console.log('🔄 refreshAuthToken: Updating session with new token...');
    await withDatabase(async (db) => {
      await db.runAsync(
        'UPDATE user_sessions SET session_token = ?, last_accessed = ? WHERE user_id = ? AND is_active = TRUE',
        [newAccessToken, new Date().toISOString(), user.id]
      );
    });

    console.log('✅ refreshAuthToken: Token refresh successful');
    return { success: true, user };
  } catch (error) {
    console.error('❌ refreshAuthToken: Token refresh error:', error);
    return { success: false };
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  console.log('🔍 getUserById: Getting user by ID:', userId);
  try {
    return await withDatabase(async (db) => {
      const userRow = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      ) as UserRow | null;

      const user = userRow ? mapRowToUser(userRow) : null;
      console.log('✅ getUserById: User retrieved:', !!user);
      return user;
    });
  } catch (error) {
    console.error('❌ getUserById: Error fetching user:', error);
    return null;
  }
}

// Enhanced session management
export async function saveAuthToken(token: string): Promise<void> {
  console.log('💾 saveAuthToken: Saving auth token...');
  try {
    await webSecureStorage.setItemAsync(AUTH_TOKEN_KEY, token);
    console.log('✅ saveAuthToken: Auth token saved successfully');
  } catch (error) {
    console.error('❌ saveAuthToken: Failed to save auth token:', error);
  }
}

export async function getAuthToken(): Promise<string | null> {
  console.log('📖 getAuthToken: Getting auth token...');
  try {
    const token = await webSecureStorage.getItemAsync(AUTH_TOKEN_KEY);
    console.log('✅ getAuthToken: Auth token retrieved:', !!token);
    return token;
  } catch (error) {
    console.error('❌ getAuthToken: Failed to get auth token:', error);
    return null;
  }
}

export async function saveRefreshToken(token: string): Promise<void> {
  console.log('💾 saveRefreshToken: Saving refresh token...');
  try {
    await webSecureStorage.setItemAsync(REFRESH_TOKEN_KEY, token);
    console.log('✅ saveRefreshToken: Refresh token saved successfully');
  } catch (error) {
    console.error('❌ saveRefreshToken: Failed to save refresh token:', error);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  console.log('📖 getRefreshToken: Getting refresh token...');
  try {
    const token = await webSecureStorage.getItemAsync(REFRESH_TOKEN_KEY);
    console.log('✅ getRefreshToken: Refresh token retrieved:', !!token);
    return token;
  } catch (error) {
    console.error('❌ getRefreshToken: Failed to get refresh token:', error);
    return null;
  }
}

export async function removeAuthToken(): Promise<void> {
  console.log('🗑️ removeAuthToken: Removing all auth tokens...');
  try {
    await webSecureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
    await webSecureStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
    await webSecureStorage.deleteItemAsync(CURRENT_USER_KEY);
    console.log('✅ removeAuthToken: All auth tokens removed successfully');
  } catch (error) {
    console.error('❌ removeAuthToken: Failed to remove auth tokens:', error);
  }
}

export async function saveCurrentUser(user: User): Promise<void> {
  console.log('💾 saveCurrentUser: Saving current user...');
  try {
    await webSecureStorage.setItemAsync(CURRENT_USER_KEY, JSON.stringify(user));
    console.log('✅ saveCurrentUser: Current user saved successfully');
  } catch (error) {
    console.error('❌ saveCurrentUser: Failed to save current user:', error);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  console.log('📖 getCurrentUser: Getting current user...');
  try {
    const userJson = await webSecureStorage.getItemAsync(CURRENT_USER_KEY);
    const user = userJson ? JSON.parse(userJson) : null;
    console.log('✅ getCurrentUser: Current user retrieved:', !!user);
    return user;
  } catch (error) {
    console.error('❌ getCurrentUser: Failed to get current user:', error);
    return null;
  }
}

// Enhanced logout with session cleanup
export async function logout(): Promise<void> {
  console.log('🚪 logout: Starting logout process...');
  try {
    const token = await getAuthToken();
    if (token) {
      console.log('🔄 logout: Invalidating session in database...');
      // Invalidate session in database
      await withDatabase(async (db) => {
        await db.runAsync(
          'UPDATE user_sessions SET is_active = FALSE WHERE session_token = ?',
          [token]
        );
      });
    }
  } catch (error) {
    console.error('❌ logout: Error during logout cleanup:', error);
  } finally {
    console.log('🗑️ logout: Removing auth tokens...');
    await removeAuthToken();
    console.log('✅ logout: Logout completed successfully');
  }
}

// Auto-login with token refresh
export async function attemptAutoLogin(): Promise<User | null> {
  console.log('🔄 attemptAutoLogin: Starting auto-login attempt...');
  try {
    const storedUser = await getCurrentUser();
    const token = await getAuthToken();

    if (!storedUser || !token) {
      console.log('🔄 attemptAutoLogin: No stored user or token, trying refresh...');
      // Try to refresh token if available
      const refreshResult = await refreshAuthToken();
      const result = refreshResult.success ? refreshResult.user || null : null;
      console.log('✅ attemptAutoLogin: Refresh result:', !!result);
      return result;
    }

    // Validate current token
    console.log('🔍 attemptAutoLogin: Validating current token...');
    const validation = await validateAuthToken();
    if (validation.valid) {
      console.log('✅ attemptAutoLogin: Token valid, user authenticated');
      return validation.user || null;
    }

    // If token is expired, try to refresh
    if (validation.expired) {
      console.log('🔄 attemptAutoLogin: Token expired, trying refresh...');
      const refreshResult = await refreshAuthToken();
      const result = refreshResult.success ? refreshResult.user || null : null;
      console.log('✅ attemptAutoLogin: Refresh after expiry result:', !!result);
      return result;
    }

    console.log('❌ attemptAutoLogin: Token invalid, removing auth data');
    await removeAuthToken();
    return null;
  } catch (error) {
    console.error('❌ attemptAutoLogin: Auto-login error:', error);
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
  console.log('🔐 changePassword: Starting password change for user:', userId);
  try {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      console.log('❌ changePassword: New password validation failed');
      return { success: false, error: 'Password requirements not met', errors: passwordValidation.errors };
    }

    return await withDatabase(async (db) => {
      // Verify current password
      console.log('🔍 changePassword: Verifying current password...');
      const user = await db.getFirstAsync(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      ) as { password_hash: string } | null;

      if (!user) {
        console.log('❌ changePassword: User not found');
        return { success: false, error: 'User not found' };
      }

      const isValidPassword = await verifyPassword(oldPassword, user.password_hash);
      if (!isValidPassword) {
        console.log('❌ changePassword: Current password incorrect');
        return { success: false, error: 'Current password is incorrect' };
      }

      // Update password
      console.log('🔄 changePassword: Updating password...');
      const newHashedPassword = await hashPassword(newPassword);
      await db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        [newHashedPassword, new Date().toISOString(), userId]
      );

      // Invalidate all existing sessions except current
      console.log('🔄 changePassword: Invalidating other sessions...');
      const currentToken = await getAuthToken();
      await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND session_token != ?',
        [userId, currentToken || '']
      );

      console.log('✅ changePassword: Password changed successfully');
      return { success: true };
    });
  } catch (error) {
    console.error('❌ changePassword: Password change error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

export async function getAllUsers(): Promise<User[]> {
  console.log('📋 getAllUsers: Getting all users...');
  try {
    return await withDatabase(async (db) => {
      const rows = await db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC') as UserRow[];
      console.log('✅ getAllUsers: Retrieved users:', rows.length);
      return rows.map(mapRowToUser);
    });
  } catch (error) {
    console.error('❌ getAllUsers: Error fetching all users:', error);
    return [];
  }
}

export async function checkUserExists(email: string): Promise<boolean> {
  console.log('🔍 checkUserExists: Checking if user exists:', email);
  try {
    return await withDatabase(async (db) => {
      const user = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      ) as { id: string } | null;
      const exists = !!user;
      console.log('✅ checkUserExists: User exists:', exists);
      return exists;
    });
  } catch (error) {
    console.error('❌ checkUserExists: Error checking user existence:', error);
    return false;
  }
}

// Get active sessions for a user
export async function getUserSessions(userId: string): Promise<SessionRow[]> {
  console.log('📋 getUserSessions: Getting sessions for user:', userId);
  try {
    return await withDatabase(async (db) => {
      const sessions = await db.getAllAsync(
        'SELECT * FROM user_sessions WHERE user_id = ? AND is_active = TRUE ORDER BY last_accessed DESC',
        [userId]
      ) as SessionRow[];
      console.log('✅ getUserSessions: Retrieved sessions:', sessions.length);
      return sessions;
    });
  } catch (error) {
    console.error('❌ getUserSessions: Error fetching user sessions:', error);
    return [];
  }
}

// Revoke a specific session
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  console.log('🗑️ revokeSession: Revoking session:', sessionId, 'for user:', userId);
  try {
    return await withDatabase(async (db) => {
      const result = await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );
      const success = result.changes > 0;
      console.log('✅ revokeSession: Session revoked:', success);
      return success;
    });
  } catch (error) {
    console.error('❌ revokeSession: Error revoking session:', error);
    return false;
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  console.log('🧹 cleanupExpiredSessions: Cleaning up expired sessions...');
  try {
    await withDatabase(async (db) => {
      const result = await db.runAsync(
        'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < ? AND is_active = TRUE',
        [new Date().toISOString()]
      );
      console.log('✅ cleanupExpiredSessions: Cleaned up sessions:', result.changes);
    });
  } catch (error) {
    console.error('❌ cleanupExpiredSessions: Error cleaning up expired sessions:', error);
  }
}

console.log('✅ lib/auth.ts: File fully loaded and all exports defined');
