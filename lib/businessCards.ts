// lib/businessCards.ts - Production-ready business card service
import { withDatabase } from './database';
import { BusinessCard, CreateBusinessCardDTO, UpdateBusinessCardDTO } from '../types/businessCard';
import * as crypto from 'expo-crypto';

// Database row type for business cards
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
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Input validation helpers
function validateBusinessCardInput(cardData: CreateBusinessCardDTO | UpdateBusinessCardDTO): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Title is required for creation
  if ('title' in cardData && !cardData.title?.trim()) {
    errors.push('Title is required');
  }
  
  // Validate email format if provided
  if (cardData.email && cardData.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cardData.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Validate phone format if provided (basic validation)
  if (cardData.phone && cardData.phone.trim()) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = cardData.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.push('Invalid phone number format');
    }
  }
  
  // Validate website URL if provided
  if (cardData.website && cardData.website.trim()) {
    try {
      new URL(cardData.website);
    } catch {
      errors.push('Invalid website URL format');
    }
  }
  
  // Validate field lengths
  if (cardData.title && cardData.title.length > 255) {
    errors.push('Title must be less than 255 characters');
  }
  if (cardData.company && cardData.company.length > 255) {
    errors.push('Company must be less than 255 characters');
  }
  if (cardData.notes && cardData.notes.length > 1000) {
    errors.push('Notes must be less than 1000 characters');
  }
  
  return { valid: errors.length === 0, errors };
}

// Generate secure business card ID
async function generateSecureCardId(): Promise<string> {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `card_${timestamp}_${random}`;
}

// Sanitize input data - fixed TypeScript issues
function sanitizeCardData<T extends Record<string, any>>(data: T): T {
  const sanitized = {} as T;
  
  // Copy and sanitize each property
  (Object.keys(data) as Array<keyof T>).forEach(key => {
    const value = data[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Convert empty strings to null for database storage
      sanitized[key] = (trimmed === '' ? null : trimmed) as T[keyof T];
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

export class BusinessCardService {

  // Create a new business card with validation
  static async create(userId: string, cardData: CreateBusinessCardDTO): Promise<{
    success: boolean;
    card?: BusinessCard;
    error?: string;
    errors?: string[];
  }> {
    try {
      // Input validation
      const validation = validateBusinessCardInput(cardData);
      if (!validation.valid) {
        return { success: false, error: 'Validation failed', errors: validation.errors };
      }

      // Sanitize input
      const sanitizedData = sanitizeCardData(cardData);

      return await withDatabase(async (db) => {
        // Check user exists
        const userExists = await db.getFirstAsync(
          'SELECT id FROM users WHERE id = ?',
          [userId]
        ) as { id: string } | null;

        if (!userExists) {
          return { success: false, error: 'User not found' };
        }

        // Generate secure ID and timestamps
        const id = await generateSecureCardId();
        const now = new Date().toISOString();

        // Insert business card
        await db.runAsync(
          `INSERT INTO business_cards (id, user_id, title, company, email, phone, website, address, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            userId,
            sanitizedData.title,
            sanitizedData.company || null,
            sanitizedData.email || null,
            sanitizedData.phone || null,
            sanitizedData.website || null,
            sanitizedData.address || null,
            sanitizedData.notes || null,
            now,
            now
          ]
        );

        // Fetch and return the created card
        const card = await this.getById(id);
        if (!card) {
          return { success: false, error: 'Failed to retrieve created card' };
        }

        console.log('Business card created:', { id, userId, title: sanitizedData.title });
        return { success: true, card };
      });
    } catch (error) {
      console.error('Error creating business card:', error);
      return { success: false, error: 'Failed to create business card' };
    }
  }

  // Get all business cards for a user with pagination
  static async getByUserId(
    userId: string, 
    options: { limit?: number; offset?: number } = {}
  ): Promise<{
    success: boolean;
    cards?: BusinessCard[];
    total?: number;
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        const { limit = 50, offset = 0 } = options;

        // Get total count
        const countResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ?',
          [userId]
        ) as { count: number } | null;

        const total = countResult?.count || 0;

        // Get cards with pagination
        const result = await db.getAllAsync(
          `SELECT * FROM business_cards 
           WHERE user_id = ? 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`,
          [userId, limit, offset]
        ) as BusinessCardRow[];

        const cards = result.map(this.mapRowToBusinessCard);

        return { success: true, cards, total };
      });
    } catch (error) {
      console.error('Error fetching business cards:', error);
      return { success: false, error: 'Failed to fetch business cards' };
    }
  }

  // Get a single business card by ID with ownership check
  static async getById(id: string, userId?: string): Promise<BusinessCard | null> {
    try {
      return await withDatabase(async (db) => {
        let query = 'SELECT * FROM business_cards WHERE id = ?';
        let params = [id];

        // If userId provided, ensure ownership
        if (userId) {
          query += ' AND user_id = ?';
          params.push(userId);
        }

        const result = await db.getFirstAsync(query, params) as BusinessCardRow | null;

        return result ? this.mapRowToBusinessCard(result) : null;
      });
    } catch (error) {
      console.error('Error fetching business card:', error);
      return null;
    }
  }

  // Search business cards by title, company, or email
  static async search(
    userId: string, 
    query: string,
    options: { limit?: number } = {}
  ): Promise<{
    success: boolean;
    cards?: BusinessCard[];
    error?: string;
  }> {
    try {
      if (!query.trim()) {
        return { success: false, error: 'Search query is required' };
      }

      return await withDatabase(async (db) => {
        const { limit = 20 } = options;
        const searchTerm = `%${query.trim()}%`;

        const result = await db.getAllAsync(
          `SELECT * FROM business_cards 
           WHERE user_id = ? AND (
             title LIKE ? OR 
             company LIKE ? OR 
             email LIKE ?
           )
           ORDER BY created_at DESC 
           LIMIT ?`,
          [userId, searchTerm, searchTerm, searchTerm, limit]
        ) as BusinessCardRow[];

        const cards = result.map(this.mapRowToBusinessCard);
        return { success: true, cards };
      });
    } catch (error) {
      console.error('Error searching business cards:', error);
      return { success: false, error: 'Search failed' };
    }
  }

  // Update a business card with validation
  static async update(
    id: string, 
    userId: string, 
    updates: UpdateBusinessCardDTO
  ): Promise<{
    success: boolean;
    card?: BusinessCard;
    error?: string;
    errors?: string[];
  }> {
    try {
      // Input validation
      const validation = validateBusinessCardInput(updates);
      if (!validation.valid) {
        return { success: false, error: 'Validation failed', errors: validation.errors };
      }

      // Sanitize input
      const sanitizedUpdates = sanitizeCardData(updates);

      return await withDatabase(async (db) => {
        // Check if card exists and is owned by user
        const existingCard = await db.getFirstAsync(
          'SELECT id FROM business_cards WHERE id = ? AND user_id = ?',
          [id, userId]
        ) as { id: string } | null;

        if (!existingCard) {
          return { success: false, error: 'Business card not found or access denied' };
        }

        const now = new Date().toISOString();
        const setClause: string[] = [];
        const values: any[] = [];

        // Build dynamic update query
        Object.entries(sanitizedUpdates).forEach(([key, value]) => {
          if (value !== undefined) {
            setClause.push(`${key} = ?`);
            values.push(value);
          }
        });

        if (setClause.length === 0) {
          return { success: false, error: 'No valid updates provided' };
        }

        // Always update the updated_at timestamp
        setClause.push('updated_at = ?');
        values.push(now, id, userId);

        await db.runAsync(
          `UPDATE business_cards SET ${setClause.join(', ')} WHERE id = ? AND user_id = ?`,
          values
        );

        // Fetch updated card
        const updatedCard = await this.getById(id, userId);
        if (!updatedCard) {
          return { success: false, error: 'Failed to retrieve updated card' };
        }

        console.log('Business card updated:', { id, userId, updates: Object.keys(sanitizedUpdates) });
        return { success: true, card: updatedCard };
      });
    } catch (error) {
      console.error('Error updating business card:', error);
      return { success: false, error: 'Failed to update business card' };
    }
  }

  // Delete a business card with soft delete option
  static async delete(
    id: string, 
    userId: string,
    options: { softDelete?: boolean } = {}
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        // Check if card exists and is owned by user
        const existingCard = await db.getFirstAsync(
          'SELECT id FROM business_cards WHERE id = ? AND user_id = ?',
          [id, userId]
        ) as { id: string } | null;

        if (!existingCard) {
          return { success: false, error: 'Business card not found or access denied' };
        }

        if (options.softDelete) {
          // Soft delete: mark as deleted but keep in database
          await db.runAsync(
            'UPDATE business_cards SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [new Date().toISOString(), new Date().toISOString(), id, userId]
          );
        } else {
          // Hard delete: remove from database
          const result = await db.runAsync(
            'DELETE FROM business_cards WHERE id = ? AND user_id = ?',
            [id, userId]
          );

          if (result.changes === 0) {
            return { success: false, error: 'Failed to delete business card' };
          }
        }

        console.log('Business card deleted:', { id, userId, softDelete: options.softDelete });
        return { success: true };
      });
    } catch (error) {
      console.error('Error deleting business card:', error);
      return { success: false, error: 'Failed to delete business card' };
    }
  }

  // Duplicate a business card
  static async duplicate(
    originalId: string, 
    userId: string,
    newTitle?: string
  ): Promise<{
    success: boolean;
    card?: BusinessCard;
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        // Get original card
        const originalCard = await this.getById(originalId, userId);
        if (!originalCard) {
          return { success: false, error: 'Original card not found or access denied' };
        }

        // Create duplicate with new ID and title
        const duplicateData: CreateBusinessCardDTO = {
          title: newTitle || `${originalCard.title} (Copy)`,
          company: originalCard.company,
          email: originalCard.email,
          phone: originalCard.phone,
          website: originalCard.website,
          address: originalCard.address,
          notes: originalCard.notes,
        };

        const result = await this.create(userId, duplicateData);
        
        if (result.success) {
          console.log('Business card duplicated:', { originalId, newId: result.card?.id, userId });
        }

        return result;
      });
    } catch (error) {
      console.error('Error duplicating business card:', error);
      return { success: false, error: 'Failed to duplicate business card' };
    }
  }

  // Get business card statistics for user
  static async getUserStats(userId: string): Promise<{
    success: boolean;
    stats?: {
      totalCards: number;
      cardsThisMonth: number;
      cardsThisWeek: number;
      mostRecentCard?: BusinessCard;
    };
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

        // Get total cards
        const totalResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ?',
          [userId]
        ) as { count: number } | null;

        // Get cards this month
        const monthResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ? AND created_at >= ?',
          [userId, startOfMonth]
        ) as { count: number } | null;

        // Get cards this week
        const weekResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ? AND created_at >= ?',
          [userId, startOfWeek]
        ) as { count: number } | null;

        // Get most recent card
        const recentResult = await db.getFirstAsync(
          'SELECT * FROM business_cards WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          [userId]
        ) as BusinessCardRow | null;

        const stats = {
          totalCards: totalResult?.count || 0,
          cardsThisMonth: monthResult?.count || 0,
          cardsThisWeek: weekResult?.count || 0,
          mostRecentCard: recentResult ? this.mapRowToBusinessCard(recentResult) : undefined,
        };

        return { success: true, stats };
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { success: false, error: 'Failed to get statistics' };
    }
  }

  // Helper method to map database row to BusinessCard object
  private static mapRowToBusinessCard(row: BusinessCardRow): BusinessCard {
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export enhanced individual functions for easier use in components
export const createBusinessCard = async (
  userId: string, 
  cardData: CreateBusinessCardDTO
): Promise<BusinessCard> => {
  const result = await BusinessCardService.create(userId, cardData);
  if (!result.success) {
    throw new Error(result.error || 'Failed to create business card');
  }
  return result.card!;
};

export const getUserBusinessCards = async (
  userId: string, 
  options?: { limit?: number; offset?: number }
): Promise<BusinessCard[]> => {
  const result = await BusinessCardService.getByUserId(userId, options);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch business cards');
  }
  return result.cards || [];
};

export const getBusinessCardById = (id: string): Promise<BusinessCard | null> =>
  BusinessCardService.getById(id);

export const updateBusinessCard = async (
  id: string, 
  userId: string, 
  updates: UpdateBusinessCardDTO
): Promise<BusinessCard> => {
  const result = await BusinessCardService.update(id, userId, updates);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update business card');
  }
  return result.card!;
};

export const deleteBusinessCard = async (id: string, userId: string): Promise<void> => {
  const result = await BusinessCardService.delete(id, userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete business card');
  }
};

// Export additional utility functions
export const searchBusinessCards = (userId: string, query: string) =>
  BusinessCardService.search(userId, query);

export const duplicateBusinessCard = (originalId: string, userId: string, newTitle?: string) =>
  BusinessCardService.duplicate(originalId, userId, newTitle);

export const getUserCardStats = (userId: string) =>
  BusinessCardService.getUserStats(userId);