// lib/database-production.ts
import { Pool, PoolClient } from 'pg';
import { User } from '../types/auth';
import { BusinessCard, BusinessCardSocialLink } from '../types/businessCard';

console.log('🚀 database-production.ts: File loading started');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'lorodex_production',
  user: process.env.DB_USER || 'valerianfourel',
  password: process.env.DB_PASSWORD || 'Boubakar21!',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

console.log('🔧 database-production.ts: Database config created:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  ssl: dbConfig.ssl,
  max: dbConfig.max,
  idleTimeoutMillis: dbConfig.idleTimeoutMillis,
  connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
});

console.log('🔧 database-production.ts: Creating PostgreSQL pool...');
const pool = new Pool(dbConfig);
console.log('✅ database-production.ts: PostgreSQL pool created');

// Pool event handlers
pool.on('error', (err) => {
  console.error('❌ PostgreSQL Pool Error: Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL Pool: Connected to PostgreSQL database');
});

pool.on('acquire', () => {
  console.log('🔄 PostgreSQL Pool: Client acquired from pool');
});

pool.on('release', () => {
  console.log('🔄 PostgreSQL Pool: Client released back to pool');
});

// Helper function for safe error handling
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

// Database row interfaces matching your schema
interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface BusinessCardRow {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface UserProfileRow {
  id: string;
  user_id: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  company: string | null;
  job_title: string | null;
  created_at: Date;
  updated_at: Date;
}

interface UserSessionRow {
  id: string;
  user_id: string;
  session_token: string;
  device_info: any;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  expires_at: Date;
  created_at: Date;
  last_accessed: Date;
}

interface SocialLinkRow {
  id: string;
  business_card_id: string;
  platform: string;
  url: string;
  display_order: number;
  created_at: Date;
}

interface ContactRow {
  id: string;
  user_id: string;
  business_card_id: string;
  contact_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_favorite: boolean;
  last_contacted: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CardExchangeRow {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  business_card_id: string;
  exchange_method: string | null;
  receiver_email: string | null;
  receiver_phone: string | null;
  location_name: string | null;
  notes: string | null;
  exchanged_at: Date;
}

console.log('🚀 database-production.ts: Interfaces defined');

// Helper functions to map database rows to domain objects
const mapUserRow = (row: UserRow): User => {
  console.log('🔄 mapUserRow: Mapping user row:', row);
  const mapped = {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at.toISOString(),
  };
  console.log('✅ mapUserRow: Mapped user:', mapped);
  return mapped;
};

const mapBusinessCardRow = (row: BusinessCardRow): BusinessCard => {
  console.log('🔄 mapBusinessCardRow: Mapping business card row:', row);
  const mapped = {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    company: row.company || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    website: row.website || undefined,
    address: row.address || undefined,
    notes: row.notes || undefined,
    deletedAt: row.deleted_at?.toISOString() || undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
  console.log('✅ mapBusinessCardRow: Mapped business card:', mapped);
  return mapped;
};

const mapSocialLinkRow = (row: SocialLinkRow): BusinessCardSocialLink => {
  console.log('🔄 mapSocialLinkRow: Mapping social link row:', row);
  const mapped = {
    id: row.id,
    businessCardId: row.business_card_id,
    platform: row.platform,
    url: row.url,
    displayOrder: row.display_order,
    createdAt: row.created_at.toISOString(),
  };
  console.log('✅ mapSocialLinkRow: Mapped social link:', mapped);
  return mapped;
};

console.log('🚀 database-production.ts: Mapper functions defined');

// Transaction wrapper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  console.log('🔄 withTransaction: Starting transaction');
  const client = await pool.connect();
  console.log('✅ withTransaction: Client acquired');

  try {
    console.log('🔄 withTransaction: Beginning transaction');
    await client.query('BEGIN');
    console.log('✅ withTransaction: Transaction begun');

    console.log('🔄 withTransaction: Executing callback');
    const result = await callback(client);
    console.log('✅ withTransaction: Callback executed successfully');

    console.log('🔄 withTransaction: Committing transaction');
    await client.query('COMMIT');
    console.log('✅ withTransaction: Transaction committed');

    return result;
  } catch (error) {
    console.error('❌ withTransaction: Error occurred, rolling back:', getErrorMessage(error));
    await client.query('ROLLBACK');
    console.log('✅ withTransaction: Transaction rolled back');
    throw error;
  } finally {
    console.log('🔄 withTransaction: Releasing client');
    client.release();
    console.log('✅ withTransaction: Client released');
  }
};

// User operations
export const createUser = async (userData: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}): Promise<User> => {
  console.log('👤 createUser: Starting user creation for:', userData.email);
  console.log('👤 createUser: User data:', { ...userData, passwordHash: '[REDACTED]' });

  const client = await pool.connect();
  console.log('✅ createUser: Database client acquired');

  try {
    const query = `
      INSERT INTO users (id, email, first_name, last_name, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    console.log('🔄 createUser: Executing query:', query);
    console.log('🔄 createUser: Query parameters:', [
      userData.id,
      userData.email.toLowerCase(),
      userData.firstName,
      userData.lastName,
      '[REDACTED]'
    ]);

    const result = await client.query(query, [
      userData.id,
      userData.email.toLowerCase(),
      userData.firstName,
      userData.lastName,
      userData.passwordHash
    ]);

    console.log('✅ createUser: Query executed successfully');
    console.log('✅ createUser: Result rows count:', result.rows.length);
    console.log('✅ createUser: Result row:', result.rows[0]);

    const mappedUser = mapUserRow(result.rows[0]);
    console.log('✅ createUser: User created successfully:', mappedUser);
    return mappedUser;
  } catch (error) {
    console.error('❌ createUser: Error occurred:', getErrorMessage(error));
    console.error('❌ createUser: Full error:', error);

    const errorMessage = getErrorMessage(error);
    if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
      console.error('❌ createUser: Duplicate email error');
      throw new Error('User with this email already exists');
    }
    throw error;
  } finally {
    console.log('🔄 createUser: Releasing client');
    client.release();
    console.log('✅ createUser: Client released');
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  console.log('👤 getUserByEmail: Starting search for email:', email);

  const client = await pool.connect();
  console.log('✅ getUserByEmail: Database client acquired');

  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    console.log('🔄 getUserByEmail: Executing query:', query);
    console.log('🔄 getUserByEmail: Query parameters:', [email.toLowerCase()]);

    const result = await client.query(query, [email.toLowerCase()]);

    console.log('✅ getUserByEmail: Query executed successfully');
    console.log('✅ getUserByEmail: Result rows count:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('ℹ️ getUserByEmail: No user found');
      return null;
    }

    console.log('✅ getUserByEmail: User found:', result.rows[0]);
    const mappedUser = mapUserRow(result.rows[0]);
    console.log('✅ getUserByEmail: Mapped user:', mappedUser);
    return mappedUser;
  } catch (error) {
    console.error('❌ getUserByEmail: Error occurred:', getErrorMessage(error));
    console.error('❌ getUserByEmail: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getUserByEmail: Releasing client');
    client.release();
    console.log('✅ getUserByEmail: Client released');
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  console.log('👤 getUserById: Starting search for ID:', id);

  const client = await pool.connect();
  console.log('✅ getUserById: Database client acquired');

  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    console.log('🔄 getUserById: Executing query:', query);
    console.log('🔄 getUserById: Query parameters:', [id]);

    const result = await client.query(query, [id]);

    console.log('✅ getUserById: Query executed successfully');
    console.log('✅ getUserById: Result rows count:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('ℹ️ getUserById: No user found');
      return null;
    }

    console.log('✅ getUserById: User found:', result.rows[0]);
    const mappedUser = mapUserRow(result.rows[0]);
    console.log('✅ getUserById: Mapped user:', mappedUser);
    return mappedUser;
  } catch (error) {
    console.error('❌ getUserById: Error occurred:', getErrorMessage(error));
    console.error('❌ getUserById: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getUserById: Releasing client');
    client.release();
    console.log('✅ getUserById: Client released');
  }
};

export const getUserWithPassword = async (email: string): Promise<(User & { passwordHash: string }) | null> => {
  console.log('👤 getUserWithPassword: Starting search for email:', email);

  const client = await pool.connect();
  console.log('✅ getUserWithPassword: Database client acquired');

  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    console.log('🔄 getUserWithPassword: Executing query:', query);
    console.log('🔄 getUserWithPassword: Query parameters:', [email.toLowerCase()]);

    const result = await client.query(query, [email.toLowerCase()]);

    console.log('✅ getUserWithPassword: Query executed successfully');
    console.log('✅ getUserWithPassword: Result rows count:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('ℹ️ getUserWithPassword: No user found');
      return null;
    }

    const row = result.rows[0];
    console.log('✅ getUserWithPassword: User found:', { ...row, password_hash: '[REDACTED]' });

    const userWithPassword = {
      ...mapUserRow(row),
      passwordHash: row.password_hash,
    };

    console.log('✅ getUserWithPassword: Mapped user with password:', { ...userWithPassword, passwordHash: '[REDACTED]' });
    return userWithPassword;
  } catch (error) {
    console.error('❌ getUserWithPassword: Error occurred:', getErrorMessage(error));
    console.error('❌ getUserWithPassword: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getUserWithPassword: Releasing client');
    client.release();
    console.log('✅ getUserWithPassword: Client released');
  }
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  console.log('👤 updateUserLastLogin: Starting update for user:', userId);

  const client = await pool.connect();
  console.log('✅ updateUserLastLogin: Database client acquired');

  try {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    console.log('🔄 updateUserLastLogin: Executing query:', query);
    console.log('🔄 updateUserLastLogin: Query parameters:', [userId]);

    const result = await client.query(query, [userId]);

    console.log('✅ updateUserLastLogin: Query executed successfully');
    console.log('✅ updateUserLastLogin: Rows affected:', result.rowCount);
  } catch (error) {
    console.error('❌ updateUserLastLogin: Error occurred:', getErrorMessage(error));
    console.error('❌ updateUserLastLogin: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 updateUserLastLogin: Releasing client');
    client.release();
    console.log('✅ updateUserLastLogin: Client released');
  }
};

export const updateUserPassword = async (userId: string, passwordHash: string): Promise<void> => {
  console.log('👤 updateUserPassword: Starting password update for user:', userId);

  const client = await pool.connect();
  console.log('✅ updateUserPassword: Database client acquired');

  try {
    const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
    console.log('🔄 updateUserPassword: Executing query:', query);
    console.log('🔄 updateUserPassword: Query parameters:', ['[REDACTED]', userId]);

    const result = await client.query(query, [passwordHash, userId]);

    console.log('✅ updateUserPassword: Query executed successfully');
    console.log('✅ updateUserPassword: Rows affected:', result.rowCount);
  } catch (error) {
    console.error('❌ updateUserPassword: Error occurred:', getErrorMessage(error));
    console.error('❌ updateUserPassword: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 updateUserPassword: Releasing client');
    client.release();
    console.log('✅ updateUserPassword: Client released');
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  console.log('👤 getAllUsers: Starting to fetch all users');

  const client = await pool.connect();
  console.log('✅ getAllUsers: Database client acquired');

  try {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    console.log('🔄 getAllUsers: Executing query:', query);

    const result = await client.query(query);

    console.log('✅ getAllUsers: Query executed successfully');
    console.log('✅ getAllUsers: Result rows count:', result.rows.length);

    const users = result.rows.map(mapUserRow);
    console.log('✅ getAllUsers: Mapped users count:', users.length);
    return users;
  } catch (error) {
    console.error('❌ getAllUsers: Error occurred:', getErrorMessage(error));
    console.error('❌ getAllUsers: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getAllUsers: Releasing client');
    client.release();
    console.log('✅ getAllUsers: Client released');
  }
};

// User Profile operations
export const createUserProfile = async (profileData: {
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
}): Promise<void> => {
  console.log('👤 createUserProfile: Starting profile creation for user:', profileData.userId);
  console.log('👤 createUserProfile: Profile data:', profileData);

  const client = await pool.connect();
  console.log('✅ createUserProfile: Database client acquired');

  try {
    const query = `
      INSERT INTO user_profiles (id, user_id, avatar_url, bio, phone, website_url, linkedin_url, twitter_url, company, job_title, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `;

    console.log('🔄 createUserProfile: Executing query:', query);
    const params = [
      profileData.id,
      profileData.userId,
      profileData.avatarUrl || null,
      profileData.bio || null,
      profileData.phone || null,
      profileData.websiteUrl || null,
      profileData.linkedinUrl || null,
      profileData.twitterUrl || null,
      profileData.company || null,
      profileData.jobTitle || null,
    ];
    console.log('🔄 createUserProfile: Query parameters:', params);

    const result = await client.query(query, params);

    console.log('✅ createUserProfile: Query executed successfully');
    console.log('✅ createUserProfile: Rows affected:', result.rowCount);
  } catch (error) {
    console.error('❌ createUserProfile: Error occurred:', getErrorMessage(error));
    console.error('❌ createUserProfile: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 createUserProfile: Releasing client');
    client.release();
    console.log('✅ createUserProfile: Client released');
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfileRow | null> => {
  console.log('👤 getUserProfile: Starting profile search for user:', userId);

  const client = await pool.connect();
  console.log('✅ getUserProfile: Database client acquired');

  try {
    const query = 'SELECT * FROM user_profiles WHERE user_id = $1';
    console.log('🔄 getUserProfile: Executing query:', query);
    console.log('🔄 getUserProfile: Query parameters:', [userId]);

    const result = await client.query(query, [userId]);

    console.log('✅ getUserProfile: Query executed successfully');
    console.log('✅ getUserProfile: Result rows count:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('ℹ️ getUserProfile: No profile found');
      return null;
    }

    console.log('✅ getUserProfile: Profile found:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ getUserProfile: Error occurred:', getErrorMessage(error));
    console.error('❌ getUserProfile: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getUserProfile: Releasing client');
    client.release();
    console.log('✅ getUserProfile: Client released');
  }
};

// User Session operations
export const createUserSession = async (sessionData: {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<void> => {
  console.log('🔐 createUserSession: Starting session creation for user:', sessionData.userId);
  console.log('🔐 createUserSession: Session data:', { ...sessionData, sessionToken: '[REDACTED]' });

  const client = await pool.connect();
  console.log('✅ createUserSession: Database client acquired');

  try {
    const query = `
      INSERT INTO user_sessions (id, user_id, session_token, device_info, ip_address, user_agent, is_active, expires_at, created_at, last_accessed)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, NOW(), NOW())
    `;

    console.log('🔄 createUserSession: Executing query:', query);
    const params = [
      sessionData.id,
      sessionData.userId,
      sessionData.sessionToken,
      sessionData.deviceInfo ? JSON.stringify(sessionData.deviceInfo) : null,
      sessionData.ipAddress || null,
      sessionData.userAgent || null,
      sessionData.expiresAt,
    ];
    console.log('🔄 createUserSession: Query parameters:', [
      sessionData.id,
      sessionData.userId,
      '[REDACTED]',
      sessionData.deviceInfo ? JSON.stringify(sessionData.deviceInfo) : null,
      sessionData.ipAddress || null,
      sessionData.userAgent || null,
      sessionData.expiresAt,
    ]);

    const result = await client.query(query, params);

    console.log('✅ createUserSession: Query executed successfully');
    console.log('✅ createUserSession: Rows affected:', result.rowCount);
  } catch (error) {
    console.error('❌ createUserSession: Error occurred:', getErrorMessage(error));
    console.error('❌ createUserSession: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 createUserSession: Releasing client');
    client.release();
    console.log('✅ createUserSession: Client released');
  }
};

export const getUserSession = async (sessionToken: string): Promise<UserSessionRow | null> => {
  console.log('🔐 getUserSession: Starting session search for token:', sessionToken.substring(0, 10) + '...');

  const client = await pool.connect();
  console.log('✅ getUserSession: Database client acquired');

  try {
    const query = 'SELECT * FROM user_sessions WHERE session_token = $1 AND is_active = TRUE';
    console.log('🔄 getUserSession: Executing query:', query);
    console.log('🔄 getUserSession: Query parameters:', ['[REDACTED]']);

    const result = await client.query(query, [sessionToken]);

    console.log('✅ getUserSession: Query executed successfully');
    console.log('✅ getUserSession: Result rows count:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('ℹ️ getUserSession: No active session found');
      return null;
    }

    const session = result.rows[0];
    console.log('✅ getUserSession: Session found:', { ...session, session_token: '[REDACTED]' });
    return session;
  } catch (error) {
    console.error('❌ getUserSession: Error occurred:', getErrorMessage(error));
    console.error('❌ getUserSession: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getUserSession: Releasing client');
    client.release();
    console.log('✅ getUserSession: Client released');
  }
};

export const updateSessionLastAccessed = async (sessionToken: string): Promise<void> => {
  console.log('🔐 updateSessionLastAccessed: Starting update for token:', sessionToken.substring(0, 10) + '...');

  const client = await pool.connect();
  console.log('✅ updateSessionLastAccessed: Database client acquired');

  try {
    const query = 'UPDATE user_sessions SET last_accessed = NOW() WHERE session_token = $1';
    console.log('🔄 updateSessionLastAccessed: Executing query:', query);
    console.log('🔄 updateSessionLastAccessed: Query parameters:', ['[REDACTED]']);

    const result = await client.query(query, [sessionToken]);

    console.log('✅ updateSessionLastAccessed: Query executed successfully');
    console.log('✅ updateSessionLastAccessed: Rows affected:', result.rowCount);
  } catch (error) {
    console.error('❌ updateSessionLastAccessed: Error occurred:', getErrorMessage(error));
    console.error('❌ updateSessionLastAccessed: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 updateSessionLastAccessed: Releasing client');
    client.release();
    console.log('✅ updateSessionLastAccessed: Client released');
  }
};

export const deactivateUserSession = async (sessionToken: string): Promise<void> => {
  console.log('🔐 deactivateUserSession: Starting deactivation for token:', sessionToken.substring(0, 10) + '...');

  const client = await pool.connect();
  console.log('✅ deactivateUserSession: Database client acquired');

  try {
    const query = 'UPDATE user_sessions SET is_active = FALSE WHERE session_token = $1';
    console.log('🔄 deactivateUserSession: Executing query:', query);
    console.log('🔄 deactivateUserSession: Query parameters:', ['[REDACTED]']);

    const result = await client.query(query, [sessionToken]);

    console.log('✅ deactivateUserSession: Query executed successfully');
    console.log('✅ deactivateUserSession: Rows affected:', result.rowCount);
  } catch (error) {
    console.error('❌ deactivateUserSession: Error occurred:', getErrorMessage(error));
    console.error('❌ deactivateUserSession: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 deactivateUserSession: Releasing client');
    client.release();
    console.log('✅ deactivateUserSession: Client released');
  }
};

export const deactivateAllUserSessions = async (userId: string, exceptToken?: string): Promise<void> => {
  console.log('🔐 deactivateAllUserSessions: Starting deactivation for user:', userId);
  console.log('🔐 deactivateAllUserSessions: Except token:', exceptToken ? exceptToken.substring(0, 10) + '...' : 'none');

  const client = await pool.connect();
  console.log('✅ deactivateAllUserSessions: Database client acquired');

  try {
    let query = 'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1';
    const params = [userId];

    if (exceptToken) {
      query += ' AND session_token != $2';
      params.push(exceptToken);
    }

    console.log('🔄 deactivateAllUserSessions: Executing query:', query);
    console.log('🔄 deactivateAllUserSessions: Query parameters:', exceptToken ? [userId, '[REDACTED]'] : [userId]);

    const result = await client.query(query, params);

    console.log('✅ deactivateAllUserSessions: Query executed successfully');
    console.log('✅ deactivateAllUserSessions: Rows affected:', result.rowCount);
  } catch (error) {
    console.error('❌ deactivateAllUserSessions: Error occurred:', getErrorMessage(error));
    console.error('❌ deactivateAllUserSessions: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 deactivateAllUserSessions: Releasing client');
    client.release();
    console.log('✅ deactivateAllUserSessions: Client released');
  }
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  console.log('🔐 cleanupExpiredSessions: Starting cleanup of expired sessions');

  const client = await pool.connect();
  console.log('✅ cleanupExpiredSessions: Database client acquired');

  try {
    const query = 'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE';
    console.log('🔄 cleanupExpiredSessions: Executing query:', query);

    const result = await client.query(query);

    console.log('✅ cleanupExpiredSessions: Query executed successfully');
    console.log('✅ cleanupExpiredSessions: Expired sessions cleaned up:', result.rowCount);
  } catch (error) {
    console.error('❌ cleanupExpiredSessions: Error occurred:', getErrorMessage(error));
    console.error('❌ cleanupExpiredSessions: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 cleanupExpiredSessions: Releasing client');
    client.release();
    console.log('✅ cleanupExpiredSessions: Client released');
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
  console.log('💼 createBusinessCard: Starting card creation for user:', cardData.userId);
  console.log('💼 createBusinessCard: Card data:', cardData);

  const client = await pool.connect();
  console.log('✅ createBusinessCard: Database client acquired');

  try {
    const query = `
      INSERT INTO business_cards (id, user_id, title, company, email, phone, website, address, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    console.log('🔄 createBusinessCard: Executing query:', query);
    const params = [
      cardData.id,
      cardData.userId,
      cardData.title,
      cardData.company || null,
      cardData.email || null,
      cardData.phone || null,
      cardData.website || null,
      cardData.address || null,
      cardData.notes || null,
    ];
    console.log('🔄 createBusinessCard: Query parameters:', params);

    const result = await client.query(query, params);

    console.log('✅ createBusinessCard: Query executed successfully');
    console.log('✅ createBusinessCard: Result rows count:', result.rows.length);
    console.log('✅ createBusinessCard: Result row:', result.rows[0]);

    const mappedCard = mapBusinessCardRow(result.rows[0]);
    console.log('✅ createBusinessCard: Card created successfully:', mappedCard);
    return mappedCard;
  } catch (error) {
    console.error('❌ createBusinessCard: Error occurred:', getErrorMessage(error));
    console.error('❌ createBusinessCard: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 createBusinessCard: Releasing client');
    client.release();
    console.log('✅ createBusinessCard: Client released');
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
  console.log('💼 getBusinessCardsByUserId: Starting search for user:', userId);
  console.log('💼 getBusinessCardsByUserId: Options:', options);

  const client = await pool.connect();
  console.log('✅ getBusinessCardsByUserId: Database client acquired');

  try {
    const { limit = 50, offset = 0, includeDeleted = false } = options;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];

    if (!includeDeleted) {
      whereClause += ' AND deleted_at IS NULL';
    }

    console.log('🔄 getBusinessCardsByUserId: Where clause:', whereClause);

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM business_cards ${whereClause}`;
    console.log('🔄 getBusinessCardsByUserId: Count query:', countQuery);
    console.log('🔄 getBusinessCardsByUserId: Count parameters:', params);

    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    console.log('✅ getBusinessCardsByUserId: Total count:', total);

    // Get cards with pagination
    const cardsQuery = `
      SELECT * FROM business_cards 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    console.log('🔄 getBusinessCardsByUserId: Cards query:', cardsQuery);
    console.log('🔄 getBusinessCardsByUserId: Cards parameters:', [...params, limit, offset]);

    const cardsResult = await client.query(cardsQuery, [...params, limit, offset]);

    console.log('✅ getBusinessCardsByUserId: Cards query executed successfully');
    console.log('✅ getBusinessCardsByUserId: Cards result rows count:', cardsResult.rows.length);

    const cards = cardsResult.rows.map(mapBusinessCardRow);
    console.log('✅ getBusinessCardsByUserId: Mapped cards count:', cards.length);

    const result = { cards, total };
    console.log('✅ getBusinessCardsByUserId: Final result:', result);
    return result;
  } catch (error) {
    console.error('❌ getBusinessCardsByUserId: Error occurred:', getErrorMessage(error));
    console.error('❌ getBusinessCardsByUserId: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getBusinessCardsByUserId: Releasing client');
    client.release();
    console.log('✅ getBusinessCardsByUserId: Client released');
  }
};

// Continue with other functions... (I'll add the rest in the next part due to length)

// Statistics operations
export const getUserStats = async (userId: string): Promise<{
  totalCards: number;
  activeCards: number;
  deletedCards: number;
  totalExchanges: number;
  totalContacts: number;
}> => {
  console.log('📊 getUserStats: Starting stats calculation for user:', userId);

  const client = await pool.connect();
  console.log('✅ getUserStats: Database client acquired');

  try {
    const queries = [
      'SELECT COUNT(*) as count FROM business_cards WHERE user_id = $1',
      'SELECT COUNT(*) as count FROM business_cards WHERE user_id = $1 AND deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM business_cards WHERE user_id = $1 AND deleted_at IS NOT NULL',
      'SELECT COUNT(*) as count FROM card_exchanges WHERE sender_id = $1',
      'SELECT COUNT(*) as count FROM contacts WHERE user_id = $1',
    ];

    console.log('🔄 getUserStats: Executing queries:', queries);

    const results = await Promise.all(
      queries.map((query, index) => {
        console.log(`🔄 getUserStats: Executing query ${index + 1}:`, query);
        return client.query(query, [userId]);
      })
    );

    console.log('✅ getUserStats: All queries executed successfully');

    const stats = {
      totalCards: parseInt(results[0].rows[0].count),
      activeCards: parseInt(results[1].rows[0].count),
      deletedCards: parseInt(results[2].rows[0].count),
      totalExchanges: parseInt(results[3].rows[0].count),
      totalContacts: parseInt(results[4].rows[0].count),
    };

    console.log('✅ getUserStats: Stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ getUserStats: Error occurred:', getErrorMessage(error));
    console.error('❌ getUserStats: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getUserStats: Releasing client');
    client.release();
    console.log('✅ getUserStats: Client released');
  }
};

// Utility functions
export const closePool = async (): Promise<void> => {
  console.log('🔄 closePool: Starting pool shutdown');
  try {
    await pool.end();
    console.log('✅ closePool: Pool closed successfully');
  } catch (error) {
    console.error('❌ closePool: Error occurred:', getErrorMessage(error));
    console.error('❌ closePool: Full error:', error);
    throw error;
  }
};

export const checkConnection = async (): Promise<boolean> => {
  console.log('🏥 checkConnection: Starting connection check');
  try {
    const client = await pool.connect();
    console.log('✅ checkConnection: Client acquired');

    await client.query('SELECT 1');
    console.log('✅ checkConnection: Test query executed successfully');

    client.release();
    console.log('✅ checkConnection: Client released');

    console.log('✅ checkConnection: Connection check passed');
    return true;
  } catch (error) {
    console.error('❌ checkConnection: Database connection check failed:', getErrorMessage(error));
    console.error('❌ checkConnection: Full error:', error);
    return false;
  }
};

// Database initialization and migration helpers
export const initializeDatabase = async (): Promise<void> => {
  console.log('🔄 initializeDatabase: Starting database initialization');

  const client = await pool.connect();
  console.log('✅ initializeDatabase: Database client acquired');

  try {
    // Check if tables exist and create them if they don't
    // This is a simplified version - in production, use proper migrations
    console.log('🔄 initializeDatabase: Checking if users table exists');
    await client.query('SELECT 1 FROM users LIMIT 1');
    console.log('✅ initializeDatabase: Database tables verified');
  } catch (error) {
    console.error('❌ initializeDatabase: Database initialization failed:', getErrorMessage(error));
    console.error('❌ initializeDatabase: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 initializeDatabase: Releasing client');
    client.release();
    console.log('✅ initializeDatabase: Client released');
  }
};

// Backup and maintenance operations
export const getTableCounts = async (): Promise<Record<string, number>> => {
  console.log('📊 getTableCounts: Starting table count calculation');

  const client = await pool.connect();
  console.log('✅ getTableCounts: Database client acquired');

  try {
    const tables = ['users', 'business_cards', 'user_profiles', 'user_sessions', 'business_card_social_links', 'contacts', 'card_exchanges'];
    const counts: Record<string, number> = {};

    console.log('🔄 getTableCounts: Tables to count:', tables);

    for (const table of tables) {
      console.log(`🔄 getTableCounts: Counting table: ${table}`);
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count);
      console.log(`✅ getTableCounts: ${table} count:`, counts[table]);
    }

    console.log('✅ getTableCounts: All table counts calculated:', counts);
    return counts;
  } catch (error) {
    console.error('❌ getTableCounts: Error occurred:', getErrorMessage(error));
    console.error('❌ getTableCounts: Full error:', error);
    throw error;
  } finally {
    console.log('🔄 getTableCounts: Releasing client');
    client.release();
    console.log('✅ getTableCounts: Client released');
  }
};

console.log('🚀 database-production.ts: File fully loaded and exported');

export default pool;
