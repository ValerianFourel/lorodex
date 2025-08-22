// lib/database.ts
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'lorodex.db';
const DATABASE_VERSION = 1;

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

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  // Return existing database if already initialized
  if (db) {
    return db;
  }

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    return await initializationPromise;
  }

  // Start new initialization
  initializationPromise = createAndInitializeDatabase();

  try {
    db = await initializationPromise;
    return db;
  } finally {
    // Clear the promise after completion (success or failure)
    initializationPromise = null;
  }
};

const createAndInitializeDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  console.log('Initializing database...');

  let database: SQLite.SQLiteDatabase;

  try {
    if (Platform.OS === 'web') {
      console.log('Opening database on web...');

      // Try different approaches for web
      try {
        // First try: Simple database name
        console.log('Attempting simple database name for web...');
        database = await SQLite.openDatabaseAsync('lorodex_web.db');
        console.log('Web database opened successfully with simple name');
      } catch (webError1) {
        console.log('Simple database name failed, trying memory database:', getErrorMessage(webError1));

        try {
          // Second try: Just use ":memory:" without unique suffix
          console.log('Attempting basic memory database...');
          database = await SQLite.openDatabaseAsync(':memory:');
          console.log('Basic memory database opened successfully');
        } catch (webError2) {
          console.log('Basic memory database failed, trying final fallback:', getErrorMessage(webError2));

          // Third try: Use a very simple approach
          try {
            console.log('Attempting database with timestamp only...');
            database = await SQLite.openDatabaseAsync(`web_db_${Date.now()}.db`);
            console.log('Timestamp database opened successfully');
          } catch (webError3) {
            console.log('All web database attempts failed:', getErrorMessage(webError3));
            throw new Error(`Web database creation failed: ${getErrorMessage(webError3)}`);
          }
        }
      }
    } else {
      console.log('Opening database on mobile...');
      // For mobile, try persistent database
      try {
        database = await SQLite.openDatabaseAsync(DATABASE_NAME);
        console.log('Mobile persistent database opened successfully');
      } catch (mobileError) {
        console.log('Mobile persistent database failed, using in-memory fallback:', getErrorMessage(mobileError));
        database = await SQLite.openDatabaseAsync(':memory:');
        console.log('Mobile memory database opened successfully');
      }
    }

    // Initialize tables immediately after database connection
    await createTables(database);

    console.log('Database initialized successfully');
    return database;

  } catch (error) {
    console.error('Database initialization failed:', getErrorMessage(error));
    throw new Error(`Failed to create database connection: ${getErrorMessage(error)}`);
  }
};

const createTables = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('Creating database tables...');

  try {
    // Enable foreign keys
    await database.execAsync('PRAGMA foreign_keys = ON;');
    console.log('Foreign keys enabled');

    // Users table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table created');

    // Business Cards table
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('Business cards table created');

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', getErrorMessage(error));
    throw error;
  }
};

// Initialize database (exported for manual initialization)
export const initializeDatabase = async (): Promise<void> => {
  try {
    await getDatabase();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', getErrorMessage(error));

    // For web, we might want to indicate that localStorage should be used instead
    if (Platform.OS === 'web') {
      console.log('Web database failed - application should use localStorage storage adapter');
      isWebFallback = true;
    }

    throw error;
  }
};

// Helper function to execute database operations safely
export const withDatabase = async <T>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> => {
  try {
    const database = await getDatabase();
    return await operation(database);
  } catch (error) {
    console.error('Database operation failed:', getErrorMessage(error));
    throw error;
  }
};

// Check if we're using web fallback mode
export const isUsingWebFallback = (): boolean => {
  return isWebFallback;
};

// Reset database (for testing/debugging)
export const resetDatabase = async (): Promise<void> => {
  console.log('Resetting database...');
  if (db) {
    db = null;
    initializationPromise = null;
    isWebFallback = false;
  }
  await getDatabase();
  console.log('Database reset complete');
};

// Get all users for testing/debugging
export const getAllUsers = async (): Promise<any[]> => {
  try {
    return await withDatabase(async (db) => {
      const rows = await db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC');
      return rows || [];
    });
  } catch (error) {
    console.error('Error fetching all users:', getErrorMessage(error));
    return [];
  }
};

// Check if a user exists by email
export const checkUserExists = async (email: string): Promise<boolean> => {
  try {
    return await withDatabase(async (db) => {
      const user = await db.getFirstAsync(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );
      return !!user;
    });
  } catch (error) {
    console.error('Error checking user existence:', getErrorMessage(error));
    return false;
  }
};

// Get database statistics for debugging
export const getDatabaseStats = async (): Promise<{
  users: number;
  businessCards: number;
  isInMemory: boolean;
  platform: string;
  isWebFallback?: boolean;
  error?: string;
}> => {
  try {
    return await withDatabase(async (db) => {
      // Use getAllAsync and get the first result instead
      const userCountResult = await db.getAllAsync('SELECT COUNT(*) as count FROM users');
      const cardCountResult = await db.getAllAsync('SELECT COUNT(*) as count FROM business_cards');

      const userCount = userCountResult[0] as { count: number } | undefined;
      const cardCount = cardCountResult[0] as { count: number } | undefined;

      return {
        users: userCount?.count || 0,
        businessCards: cardCount?.count || 0,
        isInMemory: Platform.OS === 'web' || !DATABASE_NAME.includes('.db'),
        platform: Platform.OS,
        isWebFallback: isWebFallback
      };
    });
  } catch (error) {
    console.error('Error getting database stats:', getErrorMessage(error));
    return { 
      users: 0, 
      businessCards: 0, 
      isInMemory: Platform.OS === 'web',
      platform: Platform.OS,
      isWebFallback: isWebFallback,
      error: getErrorMessage(error)
    };
  }
};
