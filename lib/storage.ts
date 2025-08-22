// lib/storage.ts
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  createdAt: string;
}

export interface BusinessCard {
  id: string;
  userId: string;
  title: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Helper function to convert undefined to null for SQLite compatibility
const toSQLiteValue = (value: any): any => {
  return value === undefined ? null : value;
};

// Storage interface
export interface StorageAdapter {
  initialize(): Promise<void>;

  // User operations
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;

  // Business card operations
  createBusinessCard(card: Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessCard>;
  getBusinessCardsByUserId(userId: string): Promise<BusinessCard[]>;
  updateBusinessCard(id: string, updates: Partial<BusinessCard>): Promise<BusinessCard | null>;
  deleteBusinessCard(id: string): Promise<boolean>;
}

// Web Storage Implementation (localStorage)
class WebStorageAdapter implements StorageAdapter {
  private static readonly USERS_KEY = 'lorodex_users';
  private static readonly CARDS_KEY = 'lorodex_business_cards';

  async initialize(): Promise<void> {
    console.log('WebStorageAdapter: Initialized using localStorage');
  }

  private getUsers(): User[] {
    try {
      const data = localStorage.getItem(WebStorageAdapter.USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading users from localStorage:', getErrorMessage(error));
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    try {
      localStorage.setItem(WebStorageAdapter.USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users to localStorage:', getErrorMessage(error));
      throw new Error('Failed to save users');
    }
  }

  private getBusinessCards(): BusinessCard[] {
    try {
      const data = localStorage.getItem(WebStorageAdapter.CARDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading business cards from localStorage:', getErrorMessage(error));
      return [];
    }
  }

  private saveBusinessCards(cards: BusinessCard[]): void {
    try {
      localStorage.setItem(WebStorageAdapter.CARDS_KEY, JSON.stringify(cards));
    } catch (error) {
      console.error('Error saving business cards to localStorage:', getErrorMessage(error));
      throw new Error('Failed to save business cards');
    }
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const users = this.getUsers();

    // Check if user already exists
    if (users.some(user => user.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('User with this email already exists');
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: userData.email.toLowerCase(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      passwordHash: userData.passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    console.log('WebStorageAdapter: User created:', { id: newUser.id, email: newUser.email });
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = this.getUsers();
    const user = users.find(u => u.id === id);
    return user || null;
  }

  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }

  async createBusinessCard(cardData: Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessCard> {
    const cards = this.getBusinessCards();

    const newCard: BusinessCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...cardData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cards.push(newCard);
    this.saveBusinessCards(cards);

    return newCard;
  }

  async getBusinessCardsByUserId(userId: string): Promise<BusinessCard[]> {
    const cards = this.getBusinessCards();
    return cards.filter(card => card.userId === userId);
  }

  async updateBusinessCard(id: string, updates: Partial<BusinessCard>): Promise<BusinessCard | null> {
    const cards = this.getBusinessCards();
    const index = cards.findIndex(card => card.id === id);

    if (index === -1) {
      return null;
    }

    cards[index] = {
      ...cards[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveBusinessCards(cards);
    return cards[index];
  }

  async deleteBusinessCard(id: string): Promise<boolean> {
    const cards = this.getBusinessCards();
    const index = cards.findIndex(card => card.id === id);

    if (index === -1) {
      return false;
    }

    cards.splice(index, 1);
    this.saveBusinessCards(cards);
    return true;
  }
}

// Mobile Storage Implementation (SQLite)
class MobileStorageAdapter implements StorageAdapter {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      console.log('MobileStorageAdapter: Opening SQLite database...');
      this.db = await SQLite.openDatabaseAsync('lorodex.db');
      await this.createTables();
      console.log('MobileStorageAdapter: SQLite database initialized');
    } catch (error) {
      console.error('MobileStorageAdapter: Failed to initialize SQLite:', getErrorMessage(error));
      throw new Error('Failed to initialize mobile database');
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync('PRAGMA foreign_keys = ON;');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.db.execAsync(`
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
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    try {
      await this.db.runAsync(
        'INSERT INTO users (id, email, first_name, last_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userData.email.toLowerCase(), userData.firstName, userData.lastName, userData.passwordHash, createdAt]
      );

      return {
        id,
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: userData.passwordHash,
        createdAt,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes('UNIQUE constraint failed')) {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    ) as any;

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync(
      'SELECT * FROM users WHERE id = ?',
      [id]
    ) as any;

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC') as any[];

    return rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    }));
  }

  async createBusinessCard(cardData: Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessCard> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Convert undefined values to null for SQLite compatibility
    const params = [
      id,
      cardData.userId,
      cardData.title,
      toSQLiteValue(cardData.company),
      toSQLiteValue(cardData.email),
      toSQLiteValue(cardData.phone),
      toSQLiteValue(cardData.website),
      toSQLiteValue(cardData.address),
      toSQLiteValue(cardData.notes),
      now,
      now
    ];

    await this.db.runAsync(
      'INSERT INTO business_cards (id, user_id, title, company, email, phone, website, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params
    );

    return {
      id,
      ...cardData,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getBusinessCardsByUserId(userId: string): Promise<BusinessCard[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      'SELECT * FROM business_cards WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    ) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company,
      email: row.email,
      phone: row.phone,
      website: row.website,
      address: row.address,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateBusinessCard(id: string, updates: Partial<BusinessCard>): Promise<BusinessCard | null> {
    if (!this.db) throw new Error('Database not initialized');

    const updatedAt = new Date().toISOString();

    // Convert undefined values to null for SQLite compatibility
    const params = [
      toSQLiteValue(updates.title),
      toSQLiteValue(updates.company),
      toSQLiteValue(updates.email),
      toSQLiteValue(updates.phone),
      toSQLiteValue(updates.website),
      toSQLiteValue(updates.address),
      toSQLiteValue(updates.notes),
      updatedAt,
      id
    ];

    await this.db.runAsync(
      'UPDATE business_cards SET title = COALESCE(?, title), company = COALESCE(?, company), email = COALESCE(?, email), phone = COALESCE(?, phone), website = COALESCE(?, website), address = COALESCE(?, address), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?',
      params
    );

    const row = await this.db.getFirstAsync('SELECT * FROM business_cards WHERE id = ?', [id]) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company,
      email: row.email,
      phone: row.phone,
      website: row.website,
      address: row.address,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteBusinessCard(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync('DELETE FROM business_cards WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

// Storage factory
let storageAdapter: StorageAdapter | null = null;

export const getStorageAdapter = async (): Promise<StorageAdapter> => {
  if (storageAdapter) {
    return storageAdapter;
  }

  console.log('Creating storage adapter for platform:', Platform.OS);

  if (Platform.OS === 'web') {
    storageAdapter = new WebStorageAdapter();
  } else {
    storageAdapter = new MobileStorageAdapter();
  }

  await storageAdapter.initialize();
  return storageAdapter;
};

// Helper functions for backward compatibility
export const initializeStorage = async (): Promise<void> => {
  await getStorageAdapter();
  console.log('Storage initialized for platform:', Platform.OS);
};

export const getStorageStats = async (): Promise<any> => {
  try {
    const adapter = await getStorageAdapter();
    const users = await adapter.getAllUsers();

    return {
      users: users.length,
      businessCards: 0, // Would need to count across all users
      platform: Platform.OS,
      storageType: Platform.OS === 'web' ? 'localStorage' : 'SQLite'
    };
  } catch (error) {
    return {
      users: 0,
      businessCards: 0,
      platform: Platform.OS,
      error: getErrorMessage(error)
    };
  }
};
