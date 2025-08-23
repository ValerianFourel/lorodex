// lib/database-web.ts - Web-compatible database layer with extensive logging
import { User } from '../types/auth';
import { BusinessCard } from '../types/businessCard';

console.log('🌐 database-web.ts: File loaded, initializing web database layer');

// Web storage keys
const STORAGE_KEYS = {
  USERS: 'lorodex_users',
  BUSINESS_CARDS: 'lorodex_business_cards',
  USER_SESSIONS: 'lorodex_user_sessions',
  USER_PROFILES: 'lorodex_user_profiles',
  CONTACTS: 'lorodex_contacts',
  CARD_EXCHANGES: 'lorodex_card_exchanges',
  SOCIAL_LINKS: 'lorodex_social_links',
} as const;

console.log('🌐 database-web.ts: Storage keys defined:', Object.keys(STORAGE_KEYS));

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Helper functions for localStorage operations
const getStorageData = <T>(key: string): T[] => {
  console.log('💾 getStorageData: Reading from key:', key);
  try {
    const data = localStorage.getItem(key);
    const result = data ? JSON.parse(data) : [];
    console.log('✅ getStorageData: Successfully read', result.length, 'items from', key);
    return result;
  } catch (error) {
    console.error('❌ getStorageData: Error reading from localStorage key', key, ':', getErrorMessage(error));
    console.error('❌ getStorageData: Error stack:', error);
    return [];
  }
};

const setStorageData = <T>(key: string, data: T[]): void => {
  console.log('💾 setStorageData: Writing', data.length, 'items to key:', key);
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log('✅ setStorageData: Successfully wrote to', key);
  } catch (error) {
    console.error('❌ setStorageData: Error writing to localStorage key', key, ':', getErrorMessage(error));
    console.error('❌ setStorageData: Error stack:', error);
  }
};

const generateId = (): string => {
  const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('🆔 generateId: Generated new ID:', id);
  return id;
};

// User operations
export const createUser = async (userData: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}): Promise<User> => {
  console.log('👤 createUser: Starting for email:', userData.email);
  try {
    const users = getStorageData<any>(STORAGE_KEYS.USERS);
    console.log('👤 createUser: Current users count:', users.length);

    // Check if user already exists
    const existingUser = users.find((u: any) => u.email === userData.email.toLowerCase());
    if (existingUser) {
      console.log('❌ createUser: User already exists with email:', userData.email);
      throw new Error('User with this email already exists');
    }

    const newUser = {
      id: userData.id,
      email: userData.email.toLowerCase(),
      first_name: userData.firstName,
      last_name: userData.lastName,
      password_hash: userData.passwordHash,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('👤 createUser: Creating new user with ID:', newUser.id);
    users.push(newUser);
    setStorageData(STORAGE_KEYS.USERS, users);

    const result = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      createdAt: newUser.created_at,
    };

    console.log('✅ createUser: User created successfully:', { id: result.id, email: result.email });
    return result;
  } catch (error) {
    console.error('❌ createUser: Failed to create user:', getErrorMessage(error));
    console.error('❌ createUser: Error stack:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  console.log('👤 getUserByEmail: Starting for email:', email);
  try {
    const users = getStorageData<any>(STORAGE_KEYS.USERS);
    console.log('👤 getUserByEmail: Searching through', users.length, 'users');

    const user = users.find((u: any) => u.email === email.toLowerCase());

    if (!user) {
      console.log('ℹ️ getUserByEmail: User not found for email:', email);
      return null;
    }

    const result = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
    };

    console.log('✅ getUserByEmail: User found:', { id: result.id, email: result.email });
    return result;
  } catch (error) {
    console.error('❌ getUserByEmail: Failed to get user:', getErrorMessage(error));
    console.error('❌ getUserByEmail: Error stack:', error);
    throw error;
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  console.log('👤 getUserById: Starting for ID:', id);
  try {
    const users = getStorageData<any>(STORAGE_KEYS.USERS);
    console.log('👤 getUserById: Searching through', users.length, 'users');

    const user = users.find((u: any) => u.id === id);

    if (!user) {
      console.log('ℹ️ getUserById: User not found for ID:', id);
      return null;
    }

    const result = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
    };

    console.log('✅ getUserById: User found:', { id: result.id, email: result.email });
    return result;
  } catch (error) {
    console.error('❌ getUserById: Failed to get user:', getErrorMessage(error));
    console.error('❌ getUserById: Error stack:', error);
    throw error;
  }
};

export const getUserWithPassword = async (email: string): Promise<(User & { passwordHash: string }) | null> => {
  console.log('👤 getUserWithPassword: Starting for email:', email);
  try {
    const users = getStorageData<any>(STORAGE_KEYS.USERS);
    console.log('👤 getUserWithPassword: Searching through', users.length, 'users');

    const user = users.find((u: any) => u.email === email.toLowerCase());

    if (!user) {
      console.log('ℹ️ getUserWithPassword: User not found for email:', email);
      return null;
    }

    const result = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      passwordHash: user.password_hash,
      createdAt: user.created_at,
    };

    console.log('✅ getUserWithPassword: User with password found:', { id: result.id, email: result.email });
    return result;
  } catch (error) {
    console.error('❌ getUserWithPassword: Failed to get user with password:', getErrorMessage(error));
    console.error('❌ getUserWithPassword: Error stack:', error);
    throw error;
  }
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  console.log('👤 updateUserLastLogin: Starting for userId:', userId);
  try {
    const users = getStorageData<any>(STORAGE_KEYS.USERS);
    console.log('👤 updateUserLastLogin: Searching through', users.length, 'users');

    const userIndex = users.findIndex((u: any) => u.id === userId);

    if (userIndex !== -1) {
      console.log('👤 updateUserLastLogin: User found at index:', userIndex);
      users[userIndex].last_login = new Date().toISOString();
      users[userIndex].updated_at = new Date().toISOString();
      setStorageData(STORAGE_KEYS.USERS, users);
      console.log('✅ updateUserLastLogin: Last login updated successfully');
    } else {
      console.log('⚠️ updateUserLastLogin: User not found for ID:', userId);
    }
  } catch (error) {
    console.error('❌ updateUserLastLogin: Failed to update last login:', getErrorMessage(error));
    console.error('❌ updateUserLastLogin: Error stack:', error);
    throw error;
  }
};

// Business card operations
export const createBusinessCard = async (cardData: {
  id: string;
  userId: string;
  title: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
}): Promise<BusinessCard> => {
  console.log('💼 createBusinessCard: Starting for userId:', cardData.userId, 'title:', cardData.title);
  try {
    const cards = getStorageData<any>(STORAGE_KEYS.BUSINESS_CARDS);
    console.log('💼 createBusinessCard: Current cards count:', cards.length);

    const newCard = {
      id: cardData.id,
      user_id: cardData.userId,
      title: cardData.title,
      company: cardData.company || null,
      email: cardData.email || null,
      phone: cardData.phone || null,
      website: cardData.website || null,
      address: cardData.address || null,
      notes: cardData.notes || null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('💼 createBusinessCard: Creating new card with ID:', newCard.id);
    cards.push(newCard);
    setStorageData(STORAGE_KEYS.BUSINESS_CARDS, cards);

    const result = {
      id: newCard.id,
      userId: newCard.user_id,
      title: newCard.title,
      company: newCard.company || undefined,
      email: newCard.email || undefined,
      phone: newCard.phone || undefined,
      website: newCard.website || undefined,
      address: newCard.address || undefined,
      notes: newCard.notes || undefined,
      createdAt: newCard.created_at,
      updatedAt: newCard.updated_at,
    };

    console.log('✅ createBusinessCard: Business card created successfully:', result.id);
    return result;
  } catch (error) {
    console.error('❌ createBusinessCard: Failed to create business card:', getErrorMessage(error));
    console.error('❌ createBusinessCard: Error stack:', error);
    throw error;
  }
};

export const getBusinessCardsByUserId = async (
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
  } = {}
): Promise<{ cards: BusinessCard[]; total: number }> => {
  console.log('💼 getBusinessCardsByUserId: Starting for userId:', userId, 'options:', options);
  try {
    const { limit = 50, offset = 0, includeDeleted = false } = options;
    const allCards = getStorageData<any>(STORAGE_KEYS.BUSINESS_CARDS);
    console.log('💼 getBusinessCardsByUserId: Total cards in storage:', allCards.length);

    let userCards = allCards.filter((card: any) => card.user_id === userId);
    console.log('💼 getBusinessCardsByUserId: User cards found:', userCards.length);

    if (!includeDeleted) {
      const beforeFilter = userCards.length;
      userCards = userCards.filter((card: any) => !card.deleted_at);
      console.log('💼 getBusinessCardsByUserId: After filtering deleted cards:', userCards.length, '(removed:', beforeFilter - userCards.length, ')');
    }

    const total = userCards.length;
    const paginatedCards = userCards
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

    console.log('💼 getBusinessCardsByUserId: Paginated cards:', paginatedCards.length, 'from offset:', offset, 'limit:', limit);

    const cards = paginatedCards.map((card: any) => ({
      id: card.id,
      userId: card.user_id,
      title: card.title,
      company: card.company || undefined,
      email: card.email || undefined,
      phone: card.phone || undefined,
      website: card.website || undefined,
      address: card.address || undefined,
      notes: card.notes || undefined,
      deletedAt: card.deleted_at || undefined,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    }));

    const result = { cards, total };
    console.log('✅ getBusinessCardsByUserId: Returning', result.cards.length, 'cards, total:', result.total);
    return result;
  } catch (error) {
    console.error('❌ getBusinessCardsByUserId: Failed to get business cards:', getErrorMessage(error));
    console.error('❌ getBusinessCardsByUserId: Error stack:', error);
    throw error;
  }
};

// Session operations (simplified for web)
export const createUserSession = async (sessionData: {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<void> => {
  console.log('🔐 createUserSession: Starting for userId:', sessionData.userId, 'token:', sessionData.sessionToken.substring(0, 10) + '...');
  try {
    const sessions = getStorageData<any>(STORAGE_KEYS.USER_SESSIONS);
    console.log('🔐 createUserSession: Current sessions count:', sessions.length);

    const newSession = {
      id: sessionData.id,
      user_id: sessionData.userId,
      session_token: sessionData.sessionToken,
      device_info: sessionData.deviceInfo || null,
      ip_address: sessionData.ipAddress || null,
      user_agent: sessionData.userAgent || null,
      is_active: true,
      expires_at: sessionData.expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
    };

    console.log('🔐 createUserSession: Creating new session with ID:', newSession.id);
    sessions.push(newSession);
    setStorageData(STORAGE_KEYS.USER_SESSIONS, sessions);
    console.log('✅ createUserSession: Session created successfully');
  } catch (error) {
    console.error('❌ createUserSession: Failed to create session:', getErrorMessage(error));
    console.error('❌ createUserSession: Error stack:', error);
    throw error;
  }
};

export const getUserSession = async (sessionToken: string): Promise<any | null> => {
  console.log('🔐 getUserSession: Starting for token:', sessionToken.substring(0, 10) + '...');
  try {
    const sessions = getStorageData<any>(STORAGE_KEYS.USER_SESSIONS);
    console.log('🔐 getUserSession: Searching through', sessions.length, 'sessions');

    const session = sessions.find((s: any) => s.session_token === sessionToken && s.is_active);

    if (session) {
      console.log('✅ getUserSession: Active session found for user:', session.user_id);
      return session;
    } else {
      console.log('ℹ️ getUserSession: No active session found for token');
      return null;
    }
  } catch (error) {
    console.error('❌ getUserSession: Failed to get session:', getErrorMessage(error));
    console.error('❌ getUserSession: Error stack:', error);
    throw error;
  }
};

export const deactivateAllUserSessions = async (userId: string, exceptToken?: string): Promise<void> => {
  console.log('🔐 deactivateAllUserSessions: Starting for userId:', userId, 'except token:', exceptToken ? exceptToken.substring(0, 10) + '...' : 'none');
  try {
    const sessions = getStorageData<any>(STORAGE_KEYS.USER_SESSIONS);
    console.log('🔐 deactivateAllUserSessions: Processing', sessions.length, 'sessions');

    let deactivatedCount = 0;
    const updatedSessions = sessions.map((session: any) => {
      if (session.user_id === userId && (!exceptToken || session.session_token !== exceptToken)) {
        if (session.is_active) {
          deactivatedCount++;
          console.log('🔐 deactivateAllUserSessions: Deactivating session:', session.id);
        }
        return { ...session, is_active: false };
      }
      return session;
    });

    setStorageData(STORAGE_KEYS.USER_SESSIONS, updatedSessions);
    console.log('✅ deactivateAllUserSessions: Deactivated', deactivatedCount, 'sessions');
  } catch (error) {
    console.error('❌ deactivateAllUserSessions: Failed to deactivate sessions:', getErrorMessage(error));
    console.error('❌ deactivateAllUserSessions: Error stack:', error);
    throw error;
  }
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  console.log('🔐 cleanupExpiredSessions: Starting cleanup...');
  try {
    const sessions = getStorageData<any>(STORAGE_KEYS.USER_SESSIONS);
    console.log('🔐 cleanupExpiredSessions: Processing', sessions.length, 'sessions');

    const now = new Date();
    let expiredCount = 0;

    const updatedSessions = sessions.map((session: any) => {
      if (new Date(session.expires_at) < now && session.is_active) {
        expiredCount++;
        console.log('🔐 cleanupExpiredSessions: Expiring session:', session.id, 'expired at:', session.expires_at);
        return { ...session, is_active: false };
      }
      return session;
    });

    setStorageData(STORAGE_KEYS.USER_SESSIONS, updatedSessions);
    console.log('✅ cleanupExpiredSessions: Cleaned up', expiredCount, 'expired sessions');
  } catch (error) {
    console.error('❌ cleanupExpiredSessions: Failed to cleanup sessions:', getErrorMessage(error));
    console.error('❌ cleanupExpiredSessions: Error stack:', error);
    throw error;
  }
};

// Statistics operations
export const getUserStats = async (userId: string): Promise<{
  totalCards: number;
  activeCards: number;
  deletedCards: number;
  totalExchanges: number;
  totalContacts: number;
}> => {
  console.log('📊 getUserStats: Starting for userId:', userId);
  try {
    const cards = getStorageData<any>(STORAGE_KEYS.BUSINESS_CARDS);
    const exchanges = getStorageData<any>(STORAGE_KEYS.CARD_EXCHANGES);
    const contacts = getStorageData<any>(STORAGE_KEYS.CONTACTS);

    console.log('📊 getUserStats: Total data - cards:', cards.length, 'exchanges:', exchanges.length, 'contacts:', contacts.length);

    const userCards = cards.filter((card: any) => card.user_id === userId);
    const userExchanges = exchanges.filter((exchange: any) => exchange.sender_id === userId);
    const userContacts = contacts.filter((contact: any) => contact.user_id === userId);

    console.log('📊 getUserStats: User data - cards:', userCards.length, 'exchanges:', userExchanges.length, 'contacts:', userContacts.length);

    const stats = {
      totalCards: userCards.length,
      activeCards: userCards.filter((card: any) => !card.deleted_at).length,
      deletedCards: userCards.filter((card: any) => card.deleted_at).length,
      totalExchanges: userExchanges.length,
      totalContacts: userContacts.length,
    };

    console.log('✅ getUserStats: Stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ getUserStats: Failed to get user stats:', getErrorMessage(error));
    console.error('❌ getUserStats: Error stack:', error);
    throw error;
  }
};

export const getTableCounts = async (): Promise<Record<string, number>> => {
  console.log('📊 getTableCounts: Starting...');
  try {
    const counts = {
      users: getStorageData<any>(STORAGE_KEYS.USERS).length,
      business_cards: getStorageData<any>(STORAGE_KEYS.BUSINESS_CARDS).length,
      user_sessions: getStorageData<any>(STORAGE_KEYS.USER_SESSIONS).length,
      user_profiles: getStorageData<any>(STORAGE_KEYS.USER_PROFILES).length,
      contacts: getStorageData<any>(STORAGE_KEYS.CONTACTS).length,
      card_exchanges: getStorageData<any>(STORAGE_KEYS.CARD_EXCHANGES).length,
      business_card_social_links: getStorageData<any>(STORAGE_KEYS.SOCIAL_LINKS).length,
    };

    console.log('✅ getTableCounts: Table counts:', counts);
    return counts;
  } catch (error) {
    console.error('❌ getTableCounts: Failed to get table counts:', getErrorMessage(error));
    console.error('❌ getTableCounts: Error stack:', error);
    throw error;
  }
};

// Utility functions
export const checkConnection = async (): Promise<boolean> => {
  console.log('🔍 checkConnection: Testing localStorage availability...');
  try {
    // Test localStorage availability
    const testKey = 'lorodex_connection_test';
    localStorage.setItem(testKey, 'test');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    const isConnected = testValue === 'test';
    console.log('✅ checkConnection: localStorage test result:', isConnected);
    return isConnected;
  } catch (error) {
    console.error('❌ checkConnection: Web storage connection check failed:', getErrorMessage(error));
    console.error('❌ checkConnection: Error stack:', error);
    return false;
  }
};

export const initializeDatabase = async (): Promise<void> => {
  console.log('🚀 initializeDatabase: Starting web database initialization...');
  try {
    console.log('🚀 initializeDatabase: Initializing localStorage with empty arrays...');

    // Initialize empty arrays if they don't exist
    let initializedCount = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
        initializedCount++;
        console.log('🚀 initializeDatabase: Initialized empty array for key:', key);
      } else {
        console.log('🚀 initializeDatabase: Key already exists:', key, 'with', JSON.parse(localStorage.getItem(key) || '[]').length, 'items');
      }
    });

    console.log('✅ initializeDatabase: Web database (localStorage) initialized successfully');
    console.log('📊 initializeDatabase: Initialized', initializedCount, 'new storage keys');

    // Log current storage state
    const currentCounts = await getTableCounts();
    console.log('📊 initializeDatabase: Current storage state:', currentCounts);
  } catch (error) {
    console.error('❌ initializeDatabase: Failed to initialize web database:', getErrorMessage(error));
    console.error('❌ initializeDatabase: Error stack:', error);
    throw error;
  }
};

// Add any other functions you need...
export const closePool = async (): Promise<void> => {
  console.log('🔌 closePool: Starting web storage cleanup...');
  try {
    // No-op for web, but we can log current state
    const currentCounts = await getTableCounts();
    console.log('🔌 closePool: Final storage state before cleanup:', currentCounts);
    console.log('✅ closePool: Web storage cleanup complete (no-op)');
  } catch (error) {
    console.error('❌ closePool: Error during cleanup:', getErrorMessage(error));
    console.error('❌ closePool: Error stack:', error);
  }
};

console.log('✅ database-web.ts: File fully loaded and all exports defined');
