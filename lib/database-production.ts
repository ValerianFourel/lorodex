// lib/database-production.ts
import { Pool } from 'pg'; // For PostgreSQL, or use mysql2 for MySQL
import { User } from '../types/auth';
import { BusinessCard } from '../types/businessCard';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'lorodex_production',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(dbConfig);

// Helper function for safe error handling
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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
      INSERT INTO users (id, email, first_name, last_name, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await client.query(query, [
      userData.id,
      userData.email.toLowerCase(),
      userData.firstName,
      userData.lastName,
      userData.passwordHash
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at.toISOString(),
    };
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

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at.toISOString(),
    };
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

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at.toISOString(),
    };
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
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      passwordHash: row.password_hash,
      createdAt: row.created_at.toISOString(),
    };
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
      INSERT INTO business_cards (id, user_id, title, company, email, phone, website, address, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      website: row.website || undefined,
      address: row.address || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } finally {
    client.release();
  }
};

export const getBusinessCardsByUserId = async (userId: string): Promise<BusinessCard[]> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM business_cards WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await client.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      website: row.website || undefined,
      address: row.address || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  } finally {
    client.release();
  }
};

export const getBusinessCardById = async (id: string): Promise<BusinessCard | null> => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM business_cards WHERE id = $1';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      website: row.website || undefined,
      address: row.address || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } finally {
    client.release();
  }
};

export const updateBusinessCard = async (
  id: string,
  updates: Partial<Omit<BusinessCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<BusinessCard | null> => {
  const client = await pool.connect();
  try {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return null;
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE business_cards 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      website: row.website || undefined,
      address: row.address || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
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

// Cleanup function
export const closePool = async (): Promise<void> => {
  await pool.end();
};

// Health check
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