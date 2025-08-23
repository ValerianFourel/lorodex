// lib/database.ts - Complete web fallback with no SQLite attempts
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'lorodex.db';
const DATABASE_VERSION = 1;

console.log('🚀 lib/database.ts: File loaded, Platform.OS =', Platform.OS);

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Single database instance and initialization promise
let db: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let isWebFallback = false;
let webFallbackForced = false;

// IMMEDIATELY FORCE WEB FALLBACK FOR WEB PLATFORM
if (Platform.OS === 'web') {
  console.log('🌐 lib/database.ts: Web platform detected - forcing immediate localStorage fallback');
  webFallbackForced = true;
  isWebFallback = true;
}

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  console.log('📊 getDatabase: Called, Platform.OS:', Platform.OS, 'webFallbackForced:', webFallbackForced);

  // If web fallback is forced, throw immediately to trigger localStorage usage
  if (webFallbackForced || Platform.OS === 'web') {
    console.log('🌐 getDatabase: Web fallback active, throwing to use localStorage');
    throw new Error('Web database unavailable - using localStorage fallback');
  }

  // Return existing database if already initialized
  if (db) {
    console.log('✅ getDatabase: Returning existing database');
    return db;
  }

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    console.log('⏳ getDatabase: Waiting for existing initialization...');
    return await initializationPromise;
  }

  // Start new initialization (only for mobile platforms now)
  console.log('🔄 getDatabase: Starting new database initialization...');
  initializationPromise = createAndInitializeDatabase();

  try {
    db = await initializationPromise;
    console.log('✅ getDatabase: Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ getDatabase: Database initialization failed:', getErrorMessage(error));

    // For mobile platforms, force fallback mode if SQLite fails
    console.log('📱 getDatabase: Mobile SQLite failed, forcing fallback mode');
    webFallbackForced = true;
    isWebFallback = true;

    throw error;
  } finally {
    // Clear the promise after completion (success or failure)
    initializationPromise = null;
  }
};

const createAndInitializeDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  console.log('🔄 createAndInitializeDatabase: Starting database creation...');

  // This should only run on mobile now since web is forced to fallback
  if (Platform.OS === 'web' || webFallbackForced) {
    console.log('🌐 createAndInitializeDatabase: Web platform or fallback forced - throwing error');
    throw new Error('Web platform should use localStorage fallback');
  }

  let database: SQLite.SQLiteDatabase;

  try {
    console.log('📱 createAndInitializeDatabase: Creating mobile database...');
    database = await createMobileDatabase();

    // Initialize tables immediately after database connection
    console.log('📋 createAndInitializeDatabase: Creating tables...');
    await createTables(database);

    console.log('✅ createAndInitializeDatabase: Database initialized successfully');
    return database;

  } catch (error) {
    console.error('❌ createAndInitializeDatabase: Database initialization failed:', getErrorMessage(error));
    throw new Error(`Failed to create database connection: ${getErrorMessage(error)}`);
  }
};

const createMobileDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  console.log('📱 createMobileDatabase: Creating mobile database...');

  const attempts = [
    {
      name: 'persistent database',
      fn: () => SQLite.openDatabaseAsync(DATABASE_NAME)
    },
    {
      name: 'memory database',
      fn: () => SQLite.openDatabaseAsync(':memory:')
    },
    {
      name: 'fallback named database',
      fn: () => SQLite.openDatabaseAsync('app_fallback.db')
    },
    {
      name: 'timestamped database',
      fn: () => SQLite.openDatabaseAsync(`app_${Date.now()}.db`)
    }
  ];

  for (const attempt of attempts) {
    try {
      console.log(`🔄 createMobileDatabase: Trying ${attempt.name}...`);
      const database = await attempt.fn();
      console.log(`✅ createMobileDatabase: ${attempt.name} opened successfully`);
      return database;
    } catch (error) {
      console.log(`❌ createMobileDatabase: ${attempt.name} failed:`, getErrorMessage(error));
      continue;
    }
  }

  // If all attempts fail, throw error to trigger localStorage fallback
  throw new Error('All mobile database creation attempts failed');
};

const createTables = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('📋 createTables: Creating database tables...');

  try {
    // Enable foreign keys
    console.log('🔧 createTables: Enabling foreign keys...');
    await database.execAsync('PRAGMA foreign_keys = ON;');
    console.log('✅ createTables: Foreign keys enabled');

    // Users table - Updated to match your auth schema
    console.log('👥 createTables: Creating users table...');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ createTables: Users table created');

    // User sessions table - For your auth system
    console.log('🔐 createTables: Creating user_sessions table...');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ createTables: User sessions table created');

    // Business Cards table
    console.log('💼 createTables: Creating business_cards table...');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS business_cards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        address TEXT,
        notes TEXT,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ createTables: Business cards table created');

    // User profiles table
    console.log('👤 createTables: Creating user_profiles table...');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        phone TEXT,
        company TEXT,
        position TEXT,
        website TEXT,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ createTables: User profiles table created');

    // Contacts table
    console.log('📞 createTables: Creating contacts table...');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        contact_user_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (contact_user_id) REFERENCES users (id) ON DELETE SET NULL
      );
    `);
    console.log('✅ createTables: Contacts table created');

    // Card exchanges table
    console.log('🔄 createTables: Creating card_exchanges table...');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS card_exchanges (
        id TEXT PRIMARY KEY,
        sender_user_id TEXT NOT NULL,
        receiver_user_id TEXT NOT NULL,
        business_card_id TEXT NOT NULL,
        exchange_method TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_card_id) REFERENCES business_cards (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ createTables: Card exchanges table created');

    // Social links table
    console.log('🔗 createTables: Creating social_links table...');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS social_links (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_card_id TEXT,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        display_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_card_id) REFERENCES business_cards (id) ON DELETE CASCADE
      );
    `);
    console.log('✅ createTables: Social links table created');

    // Create indexes for better performance
    console.log('📊 createTables: Creating indexes...');
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
      CREATE INDEX IF NOT EXISTS idx_business_cards_user_id ON business_cards(user_id);
      CREATE INDEX IF NOT EXISTS idx_business_cards_deleted ON business_cards(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_exchanges_sender ON card_exchanges(sender_user_id);
      CREATE INDEX IF NOT EXISTS idx_exchanges_receiver ON card_exchanges(receiver_user_id);
      CREATE INDEX IF NOT EXISTS idx_social_links_user_id ON social_links(user_id);
      CREATE INDEX IF NOT EXISTS idx_social_links_card_id ON social_links(business_card_id);
    `);
    console.log('✅ createTables: Indexes created');

    console.log('✅ createTables: All database tables created successfully');
  } catch (error) {
    console.error('❌ createTables: Error creating database tables:', getErrorMessage(error));
    throw error;
  }
};

// Initialize database (exported for manual initialization)
export const initializeDatabase = async (): Promise<void> => {
  console.log('🚀 initializeDatabase: Starting database initialization...');
  console.log('🚀 initializeDatabase: Platform.OS:', Platform.OS);

  if (Platform.OS === 'web') {
    console.log('🌐 initializeDatabase: Web platform - localStorage fallback will be used automatically');
    isWebFallback = true;
    webFallbackForced = true;
    console.log('✅ initializeDatabase: Web fallback mode activated');
    return; // Don't try to initialize SQLite on web
  }

  try {
    console.log('📱 initializeDatabase: Attempting mobile database initialization...');
    await getDatabase();
    console.log('✅ initializeDatabase: Database initialization completed successfully');
  } catch (error) {
    console.error('❌ initializeDatabase: Database initialization failed:', getErrorMessage(error));

    // For mobile, we might want to indicate that localStorage should be used instead
    console.log('📱 initializeDatabase: Mobile database failed - forcing localStorage fallback');
    isWebFallback = true;
    webFallbackForced = true;

    // Don't throw error, let the app continue with localStorage fallback
    console.log('✅ initializeDatabase: Continuing with localStorage fallback mode');
  }
};

// Helper function to execute database operations safely
export const withDatabase = async <T>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> => {
  console.log('🔄 withDatabase: Executing database operation...');
  console.log('🔄 withDatabase: Platform.OS:', Platform.OS, 'webFallbackForced:', webFallbackForced);

  if (webFallbackForced || Platform.OS === 'web') {
    console.log('🌐 withDatabase: Web fallback active, throwing to use localStorage');
    throw new Error('Database unavailable - using localStorage fallback');
  }

  try {
    const database = await getDatabase();
    console.log('✅ withDatabase: Database obtained, executing operation...');
    const result = await operation(database);
    console.log('✅ withDatabase: Operation completed successfully');
    return result;
  } catch (error) {
    console.error('❌ withDatabase: Database operation failed:', getErrorMessage(error));

    // If this is a database failure, ensure fallback is triggered
    if (!webFallbackForced) {
      console.log('🌐 withDatabase: Forcing fallback due to operation failure');
      webFallbackForced = true;
      isWebFallback = true;
    }

    throw error;
  }
};

// Check if we're using web fallback mode
export const isUsingWebFallback = (): boolean => {
  const fallback = isWebFallback || webFallbackForced || Platform.OS === 'web';
  console.log('🔍 isUsingWebFallback: Platform:', Platform.OS, 'Returning:', fallback);
  return fallback;
};

// Force web fallback mode (for testing or when SQLite fails)
export const forceWebFallback = (): void => {
  console.log('🌐 forceWebFallback: Forcing web fallback mode');
  webFallbackForced = true;
  isWebFallback = true;
  db = null;
  initializationPromise = null;
};

// Reset database (for testing/debugging)
export const resetDatabase = async (): Promise<void> => {
  console.log('🔄 resetDatabase: Resetting database...');
  if (db) {
    db = null;
    initializationPromise = null;
    if (Platform.OS !== 'web') {
      isWebFallback = false;
      webFallbackForced = false;
    }
  }

  if (Platform.OS !== 'web' && !webFallbackForced) {
    try {
      await getDatabase();
    } catch (error) {
      console.log('🌐 resetDatabase: Database reset failed, using fallback mode');
      webFallbackForced = true;
      isWebFallback = true;
    }
  }
  console.log('✅ resetDatabase: Database reset complete');
};

// Get all users for testing/debugging
export const getAllUsers = async (): Promise<any[]> => {
  console.log('👥 getAllUsers: Fetching all users...');
  try {
    return await withDatabase(async (db) => {
      const rows = await db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC');
      console.log('✅ getAllUsers: Retrieved users:', rows?.length || 0);
      return rows || [];
    });
  } catch (error) {
    console.error('❌ getAllUsers: Error fetching all users:', getErrorMessage(error));
    return [];
  }
};

// Check if a user exists by email
export const checkUserExists = async (email: string): Promise<boolean> => {
  console.log('🔍 checkUserExists: Checking if user exists:', email);
  try {
    return await withDatabase(async (db) => {
      const user = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );
      const exists = !!user;
      console.log('✅ checkUserExists: User exists:', exists);
      return exists;
    });
  } catch (error) {
    console.error('❌ checkUserExists: Error checking user existence:', getErrorMessage(error));
    return false;
  }
};

// Get database statistics for debugging
export const getDatabaseStats = async (): Promise<{
  users: number;
  businessCards: number;
  sessions: number;
  isInMemory: boolean;
  platform: string;
  isWebFallback?: boolean;
  webFallbackForced?: boolean;
  error?: string;
}> => {
  console.log('📊 getDatabaseStats: Getting database statistics...');
  try {
    return await withDatabase(async (db) => {
      // Use getAllAsync and get the first result instead
      const userCountResult = await db.getAllAsync('SELECT COUNT(*) as count FROM users');
      const cardCountResult = await db.getAllAsync('SELECT COUNT(*) as count FROM business_cards');
      const sessionCountResult = await db.getAllAsync('SELECT COUNT(*) as count FROM user_sessions');

      const userCount = userCountResult[0] as { count: number } | undefined;
      const cardCount = cardCountResult[0] as { count: number } | undefined;
      const sessionCount = sessionCountResult[0] as { count: number } | undefined;

      const stats = {
        users: userCount?.count || 0,
        businessCards: cardCount?.count || 0,
        sessions: sessionCount?.count || 0,
        isInMemory: Platform.OS === 'web' || !DATABASE_NAME.includes('.db'),
        platform: Platform.OS,
        isWebFallback: isWebFallback,
        webFallbackForced: webFallbackForced
      };

      console.log('✅ getDatabaseStats: Stats retrieved:', stats);
      return stats;
    });
  } catch (error) {
    console.error('❌ getDatabaseStats: Error getting database stats:', getErrorMessage(error));
    return { 
      users: 0, 
      businessCards: 0, 
      sessions: 0,
      isInMemory: Platform.OS === 'web',
      platform: Platform.OS,
      isWebFallback: isWebFallback,
      webFallbackForced: webFallbackForced,
      error: getErrorMessage(error)
    };
  }
};

// Test database connection
export const testDatabaseConnection = async (): Promise<{
  success: boolean;
  error?: string;
  fallbackMode?: boolean;
}> => {
  console.log('🧪 testDatabaseConnection: Testing database connection...');
  console.log('🧪 testDatabaseConnection: Platform.OS:', Platform.OS, 'webFallbackForced:', webFallbackForced);

  if (webFallbackForced || Platform.OS === 'web') {
    console.log('🌐 testDatabaseConnection: Fallback mode - localStorage will be used');
    return { success: true, fallbackMode: true };
  }

  try {
    await withDatabase(async (db) => {
      // Simple test query
      await db.getAllAsync('SELECT 1 as test');
    });

    console.log('✅ testDatabaseConnection: Database connection successful');
    return { success: true, fallbackMode: isWebFallback };
  } catch (error) {
    console.error('❌ testDatabaseConnection: Database connection failed:', getErrorMessage(error));
    return { 
      success: false, 
      error: getErrorMessage(error),
      fallbackMode: isWebFallback 
    };
  }
};

console.log('✅ lib/database.ts: File fully loaded');
