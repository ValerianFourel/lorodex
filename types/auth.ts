// types/auth.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Registration data sent to the auth service
export interface RegisterCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  // confirmPassword is NOT needed here - it's only for UI validation
}

// Optional: Create a separate type for form data if you want
export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string; // Only needed for form validation
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Main auth context interface with optional database helpers
export interface AuthContextType {
  authState: AuthState;
  user: User | null; // Direct access to user
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser?: () => Promise<void>; // Optional helper to refresh user data from database
  checkDatabaseHealth?: () => Promise<boolean>; // Optional helper to check database connection
}

// Additional types for database operations and statistics
export interface UserStatistics {
  totalCards: number;
  activeCards: number;
  deletedCards: number;
  totalExchanges: number;
  totalContacts: number;
}

export interface DatabaseInfo {
  tableCounts: Record<string, number>;
  isConnected: boolean;
  timestamp: string;
}

// User profile data (for future use with user_profiles table)
export interface UserProfile {
  id: string;
  userId: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  company?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
}

// User session data (for session management)
export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  lastAccessed: string;
}

// Extended user type with additional profile information
export interface UserWithProfile extends User {
  profile?: UserProfile;
  lastLogin?: string;
}

// Auth result types for better error handling
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

// Login result with additional session information
export interface LoginResult extends AuthResult {
  sessionId?: string;
  expiresAt?: string;
}

// Registration result with additional user creation details
export interface RegistrationResult extends AuthResult {
  profileCreated?: boolean;
  emailVerificationSent?: boolean;
}

// Password reset types (for future implementation)
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

// Email verification types (for future implementation)
export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationConfirm {
  token: string;
}

// Auth error types for better error handling
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: any;
}

// Token types for JWT handling
export interface AuthToken {
  token: string;
  expiresAt: string;
  refreshToken?: string;
}

// Decoded JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  sessionId?: string;
  iat: number;
  exp: number;
}

// Auth configuration types
export interface AuthConfig {
  tokenExpirationTime: number; // in milliseconds
  refreshTokenExpirationTime: number; // in milliseconds
  maxSessionsPerUser: number;
  requireEmailVerification: boolean;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
}

// Auth hooks return types
export interface UseAuthReturn extends AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  hasError: boolean;
  error?: string;
}

export interface UseAuthDatabaseReturn extends UseAuthReturn {
  getUserStatistics: () => Promise<UserStatistics | null>;
  getDatabaseInfo: () => Promise<DatabaseInfo | null>;
  refreshUserProfile: () => Promise<UserProfile | null>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Auth form field types
export interface AuthFormField {
  name: string;
  type: 'text' | 'email' | 'password';
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule;
}

// Complete auth form configuration
export interface AuthFormConfig {
  fields: AuthFormField[];
  submitButtonText: string;
  alternateActionText?: string;
  alternateActionLink?: string;
}

// Export default auth configuration
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  tokenExpirationTime: 24 * 60 * 60 * 1000, // 24 hours
  refreshTokenExpirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSessionsPerUser: 5,
  requireEmailVerification: false,
  passwordMinLength: 8,
  passwordRequireSpecialChars: true,
};

// Validation rules for auth forms
export const AUTH_VALIDATION_RULES: Record<string, ValidationRule> = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 8,
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  confirmPassword: {
    required: true,
    custom: (value: string, formData?: any) => {
      return value === formData?.password || 'Passwords do not match';
    },
  },
};
