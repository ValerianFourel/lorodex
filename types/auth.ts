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

// types/auth.ts - Add this to your existing file
export interface AuthContextType {
  authState: AuthState;
  user: User | null; // Direct access to user
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}
