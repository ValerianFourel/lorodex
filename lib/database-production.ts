// lib/database-production.ts
import { Pool, PoolClient } from 'pg';
import { User } from '../types/auth';
import { BusinessCard, BusinessCardSocialLink } from '../types/businessCard';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'lorodex_production',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

const pool = new Pool(dbConfig);

// Pool event handlers
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Helper function for safe error handling
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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

// Helper functions to map database rows to domain objects
const mapUserRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  createdAt: row.created_at.toISOString(),
});

const mapBusinessCardRow = (row: BusinessCardRow): BusinessCard => ({
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
});

const mapSocialLinkRow = (row: SocialLinkRow): BusinessCardSocialLink => ({
  id: row.id,
  businessCardId: row.business_card_id,
  platform: row.platform,
  url: row.url,
  displayOrder: row.display_order,
  createdAt: row.created_at.toISOString(),
});

// Transaction wrapper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO users (id, email, first_name, last_name, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const result = await client.query(query, [
      userData.id,
      userData.email.toLowerCase(),
      userData.firstName,
      userData.lastName,
      userData.passwordHash
    ]);

    return mapUserRow(result.rows[0]);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
      throw new Error('User with this email already exists');
    }
    throw error;
  } finally {
    client.release();
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await client.query(query, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapUserRow(result.rows[0]);
  } finally {
    client.release();
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapUserRow(result.rows[0]);
  } finally {
    client.release();
  }
};

export const getUserWithPassword = async (email: string): Promise<(User & { passwordHash: string }) | null> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await client.query(query, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...mapUserRow(row),
      passwordHash: row.password_hash,
    };
  } finally {
    client.release();
  }
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    await client.query(query, [userId]);
  } finally {
    client.release();
  }
};

export const updateUserPassword = async (userId: string, passwordHash: string): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
    await client.query(query, [passwordHash, userId]);
  } finally {
    client.release();
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await client.query(query);

    return result.rows.map(mapUserRow);
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO user_profiles (id, user_id, avatar_url, bio, phone, website_url, linkedin_url, twitter_url, company, job_title, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `;

    await client.query(query, [
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
    ]);
  } finally {
    client.release();
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfileRow | null> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM user_profiles WHERE user_id = $1';
    const result = await client.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO user_sessions (id, user_id, session_token, device_info, ip_address, user_agent, is_active, expires_at, created_at, last_accessed)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, NOW(), NOW())
    `;

    await client.query(query, [
      sessionData.id,
      sessionData.userId,
      sessionData.sessionToken,
      sessionData.deviceInfo ? JSON.stringify(sessionData.deviceInfo) : null,
      sessionData.ipAddress || null,
      sessionData.userAgent || null,
      sessionData.expiresAt,
    ]);
  } finally {
    client.release();
  }
};

export const getUserSession = async (sessionToken: string): Promise<UserSessionRow | null> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM user_sessions WHERE session_token = $1 AND is_active = TRUE';
    const result = await client.query(query, [sessionToken]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

export const updateSessionLastAccessed = async (sessionToken: string): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = 'UPDATE user_sessions SET last_accessed = NOW() WHERE session_token = $1';
    await client.query(query, [sessionToken]);
  } finally {
    client.release();
  }
};

export const deactivateUserSession = async (sessionToken: string): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = 'UPDATE user_sessions SET is_active = FALSE WHERE session_token = $1';
    await client.query(query, [sessionToken]);
  } finally {
    client.release();
  }
};

export const deactivateAllUserSessions = async (userId: string, exceptToken?: string): Promise<void> => {
  const client = await pool.connect();
  try {
    let query = 'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1';
    const params = [userId];

    if (exceptToken) {
      query += ' AND session_token != $2';
      params.push(exceptToken);
    }

    await client.query(query, params);
  } finally {
    client.release();
  }
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = 'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE';
    await client.query(query);
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO business_cards (id, user_id, title, company, email, phone, website, address, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const result = await client.query(query, [
      cardData.id,
      cardData.userId,
      cardData.title,
      cardData.company || null,
      cardData.email || null,
      cardData.phone || null,
      cardData.website || null,
      cardData.address || null,
      cardData.notes || null,
    ]);

    return mapBusinessCardRow(result.rows[0]);
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const { limit = 50, offset = 0, includeDeleted = false } = options;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];

    if (!includeDeleted) {
      whereClause += ' AND deleted_at IS NULL';
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM business_cards ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get cards with pagination
    const cardsQuery = `
      SELECT * FROM business_cards 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const cardsResult = await client.query(cardsQuery, [...params, limit, offset]);

    const cards = cardsResult.rows.map(mapBusinessCardRow);

    return { cards, total };
  } finally {
    client.release();
  }
};

export const getBusinessCardById = async (id: string, userId?: string): Promise<BusinessCard | null> => {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM business_cards WHERE id = $1 AND deleted_at IS NULL';
    const params = [id];

    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return mapBusinessCardRow(result.rows[0]);
  } finally {
    client.release();
  }
};

export const updateBusinessCard = async (
  id: string,
  userId: string,
  updates: Partial<Omit<BusinessCard, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
): Promise<BusinessCard | null> => {
  const client = await pool.connect();
  try {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Map TypeScript property names to database column names
    const fieldMapping: Record<string, string> = {
      title: 'title',
      company: 'company',
      email: 'email',
      phone: 'phone',
      website: 'website',
      address: 'address',
      notes: 'notes'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMapping[key]) {
        setClause.push(`${fieldMapping[key]} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return null;
    }

    // Add updated_at timestamp
    setClause.push('updated_at = NOW()');
    values.push(id, userId);

    const query = `
      UPDATE business_cards 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return mapBusinessCardRow(result.rows[0]);
  } finally {
    client.release();
  }
};


export const softDeleteBusinessCard = async (id: string, userId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const query = 'UPDATE business_cards SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL';
    const result = await client.query(query, [id, userId]);

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
};

export const restoreBusinessCard = async (id: string, userId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const query = 'UPDATE business_cards SET deleted_at = NULL WHERE id = $1 AND user_id = $2';
    const result = await client.query(query, [id, userId]);

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
};

export const deleteBusinessCard = async (id: string, userId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const query = 'DELETE FROM business_cards WHERE id = $1 AND user_id = $2';
    const result = await client.query(query, [id, userId]);

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
};

export const searchBusinessCards = async (
  userId: string,
  searchTerm: string,
  limit: number = 20
): Promise<BusinessCard[]> => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT * FROM business_cards 
      WHERE user_id = $1 AND deleted_at IS NULL AND (
        title ILIKE $2 OR 
        company ILIKE $2 OR 
        email ILIKE $2
      )
      ORDER BY created_at DESC 
      LIMIT $3
    `;

    const result = await client.query(query, [userId, `%${searchTerm}%`, limit]);

    return result.rows.map(mapBusinessCardRow);
  } finally {
    client.release();
  }
};

// Business Card Social Links operations
export const createSocialLink = async (linkData: {
  id: string;
  businessCardId: string;
  platform: string;
  url: string;
  displayOrder?: number;
}): Promise<BusinessCardSocialLink> => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO business_card_social_links (id, business_card_id, platform, url, display_order, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const result = await client.query(query, [
      linkData.id,
      linkData.businessCardId,
      linkData.platform,
      linkData.url,
      linkData.displayOrder || 0,
    ]);

    return mapSocialLinkRow(result.rows[0]);
  } finally {
    client.release();
  }
};

export const getSocialLinksByCardId = async (businessCardId: string): Promise<BusinessCardSocialLink[]> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM business_card_social_links WHERE business_card_id = $1 ORDER BY display_order ASC, created_at ASC';
    const result = await client.query(query, [businessCardId]);

    return result.rows.map(mapSocialLinkRow);
  } finally {
    client.release();
  }
};

export const deleteSocialLink = async (id: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const query = 'DELETE FROM business_card_social_links WHERE id = $1';
    const result = await client.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
};

// Contacts operations
export const createContact = async (contactData: {
  id: string;
  userId: string;
  businessCardId: string;
  contactName?: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
  isFavorite?: boolean;
}): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO contacts (id, user_id, business_card_id, contact_name, company, email, phone, notes, is_favorite, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (user_id, business_card_id) DO UPDATE SET
        contact_name = EXCLUDED.contact_name,
        company = EXCLUDED.company,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        notes = EXCLUDED.notes,
        is_favorite = EXCLUDED.is_favorite,
        updated_at = NOW()
    `;

    await client.query(query, [
      contactData.id,
      contactData.userId,
      contactData.businessCardId,
      contactData.contactName || null,
      contactData.company || null,
      contactData.email || null,
      contactData.phone || null,
      contactData.notes || null,
      contactData.isFavorite || false,
    ]);
  } finally {
    client.release();
  }
};

export const getContactsByUserId = async (userId: string): Promise<ContactRow[]> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await client.query(query, [userId]);

    return result.rows;
  } finally {
    client.release();
  }
};

// Card Exchanges operations
export const createCardExchange = async (exchangeData: {
  id: string;
  senderId: string;
  receiverId?: string;
  businessCardId: string;
  exchangeMethod?: string;
  receiverEmail?: string;
  receiverPhone?: string;
  locationName?: string;
  notes?: string;
}): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO card_exchanges (id, sender_id, receiver_id, business_card_id, exchange_method, receiver_email, receiver_phone, location_name, notes, exchanged_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `;

    await client.query(query, [
      exchangeData.id,
      exchangeData.senderId,
      exchangeData.receiverId || null,
      exchangeData.businessCardId,
      exchangeData.exchangeMethod || null,
      exchangeData.receiverEmail || null,
      exchangeData.receiverPhone || null,
      exchangeData.locationName || null,
      exchangeData.notes || null,
    ]);
  } finally {
    client.release();
  }
};

export const getCardExchangesByUserId = async (userId: string): Promise<CardExchangeRow[]> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM card_exchanges WHERE sender_id = $1 OR receiver_id = $1 ORDER BY exchanged_at DESC';
    const result = await client.query(query, [userId]);

    return result.rows;
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const queries = [
      'SELECT COUNT(*) as count FROM business_cards WHERE user_id = $1',
      'SELECT COUNT(*) as count FROM business_cards WHERE user_id = $1 AND deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM business_cards WHERE user_id = $1 AND deleted_at IS NOT NULL',
      'SELECT COUNT(*) as count FROM card_exchanges WHERE sender_id = $1',
      'SELECT COUNT(*) as count FROM contacts WHERE user_id = $1',
    ];

    const results = await Promise.all(
      queries.map(query => client.query(query, [userId]))
    );

    return {
      totalCards: parseInt(results[0].rows[0].count),
      activeCards: parseInt(results[1].rows[0].count),
      deletedCards: parseInt(results[2].rows[0].count),
      totalExchanges: parseInt(results[3].rows[0].count),
      totalContacts: parseInt(results[4].rows[0].count),
    };
  } finally {
    client.release();
  }
};

// Utility functions
export const closePool = async (): Promise<void> => {
  await pool.end();
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection check failed:', getErrorMessage(error));
    return false;
  }
};

// Database initialization and migration helpers
export const initializeDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    // Check if tables exist and create them if they don't
    // This is a simplified version - in production, use proper migrations
    await client.query('SELECT 1 FROM users LIMIT 1');
    console.log('Database tables verified');
  } catch (error) {
    console.error('Database initialization failed:', getErrorMessage(error));
    throw error;
  } finally {
    client.release();
  }
};

// Backup and maintenance operations
export const getTableCounts = async (): Promise<Record<string, number>> => {
  const client = await pool.connect();
  try {
    const tables = ['users', 'business_cards', 'user_profiles', 'user_sessions', 'business_card_social_links', 'contacts', 'card_exchanges'];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count);
    }

    return counts;
  } finally {
    client.release();
  }
};

export default pool;
