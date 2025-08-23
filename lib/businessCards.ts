// lib/businessCards.ts - Production-ready business card service
import { withDatabase } from './database';
import { BusinessCard, CreateBusinessCardDTO, UpdateBusinessCardDTO, BusinessCardSocialLink, CreateSocialLinkDTO } from '../types/businessCard';

// Database row types matching your schema
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
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SocialLinkRow {
  id: string;
  business_card_id: string;
  platform: string;
  url: string;
  display_order: number;
  created_at: string;
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
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
    if (!phoneRegex.test(cardData.phone)) {
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

  // Validate field lengths (matching schema constraints)
  if (cardData.title && cardData.title.length > 255) {
    errors.push('Title must be less than 255 characters');
  }
  if (cardData.company && cardData.company.length > 255) {
    errors.push('Company must be less than 255 characters');
  }
  if (cardData.email && cardData.email.length > 255) {
    errors.push('Email must be less than 255 characters');
  }
  if (cardData.phone && cardData.phone.length > 255) {
    errors.push('Phone must be less than 255 characters');
  }

  return { valid: errors.length === 0, errors };
}

// Generate secure business card ID matching schema pattern
function generateSecureCardId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `card_${timestamp}_${random}`;
}

// Generate secure social link ID
function generateSocialLinkId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `social_${timestamp}_${random}`;
}

// Sanitize input data
function sanitizeCardData<T extends Record<string, any>>(data: T): T {
  const sanitized = {} as T;

  (Object.keys(data) as Array<keyof T>).forEach(key => {
    const value = data[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
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
        const id = generateSecureCardId();
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

  // Get all business cards for a user with pagination (excluding soft deleted)
  static async getByUserId(
    userId: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      includeDeleted?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    cards?: BusinessCard[];
    total?: number;
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        const { limit = 50, offset = 0, includeDeleted = false } = options;

        // Build query conditions
        let whereClause = 'WHERE user_id = ?';
        const params = [userId];

        if (!includeDeleted) {
          whereClause += ' AND deleted_at IS NULL';
        }

        // Get total count
        const countResult = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM business_cards ${whereClause}`,
          params
        ) as { count: number } | null;

        const total = countResult?.count || 0;

        // Get cards with pagination
        const result = await db.getAllAsync(
          `SELECT * FROM business_cards 
           ${whereClause}
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`,
          [...params, limit, offset]
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
        let query = 'SELECT * FROM business_cards WHERE id = ? AND deleted_at IS NULL';
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
           WHERE user_id = ? AND deleted_at IS NULL AND (
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
          'SELECT id FROM business_cards WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
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

  // Delete a business card with soft delete support (matching schema)
  static async delete(
    id: string, 
    userId: string,
    options: { softDelete?: boolean } = { softDelete: true }
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        // Check if card exists and is owned by user
        const existingCard = await db.getFirstAsync(
          'SELECT id FROM business_cards WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
          [id, userId]
        ) as { id: string } | null;

        if (!existingCard) {
          return { success: false, error: 'Business card not found or access denied' };
        }

        if (options.softDelete) {
          // Soft delete: mark as deleted but keep in database (matching schema)
          await db.runAsync(
            'UPDATE business_cards SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [new Date().toISOString(), new Date().toISOString(), id, userId]
          );
        } else {
          // Hard delete: remove from database (also removes related social links via CASCADE)
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

  // Restore a soft-deleted business card
  static async restore(
    id: string, 
    userId: string
  ): Promise<{
    success: boolean;
    card?: BusinessCard;
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        // Check if card exists and is soft-deleted
        const existingCard = await db.getFirstAsync(
          'SELECT id FROM business_cards WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
          [id, userId]
        ) as { id: string } | null;

        if (!existingCard) {
          return { success: false, error: 'Deleted business card not found or access denied' };
        }

        // Restore the card
        await db.runAsync(
          'UPDATE business_cards SET deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?',
          [new Date().toISOString(), id, userId]
        );

        // Fetch restored card
        const restoredCard = await this.getById(id, userId);
        if (!restoredCard) {
          return { success: false, error: 'Failed to retrieve restored card' };
        }

        console.log('Business card restored:', { id, userId });
        return { success: true, card: restoredCard };
      });
    } catch (error) {
      console.error('Error restoring business card:', error);
      return { success: false, error: 'Failed to restore business card' };
    }
  }

  // Social Links Management

  // Add social link to business card
  static async addSocialLink(
    businessCardId: string,
    userId: string,
    linkData: CreateSocialLinkDTO
  ): Promise<{
    success: boolean;
    link?: BusinessCardSocialLink;
    error?: string;
  }> {
    try {
      return await withDatabase(async (db) => {
        // Verify card ownership
        const cardExists = await db.getFirstAsync(
          'SELECT id FROM business_cards WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
          [businessCardId, userId]
        ) as { id: string } | null;

        if (!cardExists) {
          return { success: false, error: 'Business card not found or access denied' };
        }

        // Validate platform and URL
        if (!linkData.platform?.trim() || !linkData.url?.trim()) {
          return { success: false, error: 'Platform and URL are required' };
        }

        try {
          new URL(linkData.url);
        } catch {
          return { success: false, error: 'Invalid URL format' };
        }

        const id = generateSocialLinkId();
        const now = new Date().toISOString();

        await db.runAsync(
          `INSERT INTO business_card_social_links (id, business_card_id, platform, url, display_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            businessCardId,
            linkData.platform.trim(),
            linkData.url.trim(),
            linkData.displayOrder || 0,
            now
          ]
        );

        const link: BusinessCardSocialLink = {
          id,
          businessCardId,
          platform: linkData.platform.trim(),
          url: linkData.url.trim(),
          displayOrder: linkData.displayOrder || 0,
          createdAt: now
        };

        return { success: true, link };
      });
    } catch (error) {
      console.error('Error adding social link:', error);
      return { success: false, error: 'Failed to add social link' };
    }
  }

  // Get social links for a business card
  static async getSocialLinks(businessCardId: string): Promise<BusinessCardSocialLink[]> {
    try {
      return await withDatabase(async (db) => {
        const result = await db.getAllAsync(
          'SELECT * FROM business_card_social_links WHERE business_card_id = ? ORDER BY display_order ASC, created_at ASC',
          [businessCardId]
        ) as SocialLinkRow[];

        return result.map(row => ({
          id: row.id,
          businessCardId: row.business_card_id,
          platform: row.platform,
          url: row.url,
          displayOrder: row.display_order,
          createdAt: row.created_at
        }));
      });
    } catch (error) {
      console.error('Error fetching social links:', error);
      return [];
    }
  }

  // Remove social link
  static async removeSocialLink(
    linkId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await withDatabase(async (db) => {
        // Verify ownership through business card
        const linkExists = await db.getFirstAsync(
          `SELECT bsl.id FROM business_card_social_links bsl
           JOIN business_cards bc ON bsl.business_card_id = bc.id
           WHERE bsl.id = ? AND bc.user_id = ? AND bc.deleted_at IS NULL`,
          [linkId, userId]
        ) as { id: string } | null;

        if (!linkExists) {
          return { success: false, error: 'Social link not found or access denied' };
        }

        const result = await db.runAsync(
          'DELETE FROM business_card_social_links WHERE id = ?',
          [linkId]
        );

        if (result.changes === 0) {
          return { success: false, error: 'Failed to remove social link' };
        }

        return { success: true };
      });
    } catch (error) {
      console.error('Error removing social link:', error);
      return { success: false, error: 'Failed to remove social link' };
    }
  }

  // Get business card statistics for user
  static async getUserStats(userId: string): Promise<{
    success: boolean;
    stats?: {
      totalCards: number;
      activeCards: number;
      deletedCards: number;
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

        // Get total cards (including deleted)
        const totalResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ?',
          [userId]
        ) as { count: number } | null;

        // Get active cards
        const activeResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ? AND deleted_at IS NULL',
          [userId]
        ) as { count: number } | null;

        // Get deleted cards
        const deletedResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ? AND deleted_at IS NOT NULL',
          [userId]
        ) as { count: number } | null;

        // Get cards this month
        const monthResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ? AND created_at >= ? AND deleted_at IS NULL',
          [userId, startOfMonth]
        ) as { count: number } | null;

        // Get cards this week
        const weekResult = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM business_cards WHERE user_id = ? AND created_at >= ? AND deleted_at IS NULL',
          [userId, startOfWeek]
        ) as { count: number } | null;

        // Get most recent card
        const recentResult = await db.getFirstAsync(
          'SELECT * FROM business_cards WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
          [userId]
        ) as BusinessCardRow | null;

        const stats = {
          totalCards: totalResult?.count || 0,
          activeCards: activeResult?.count || 0,
          deletedCards: deletedResult?.count || 0,
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
      deletedAt: row.deleted_at || undefined,
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
  options?: { limit?: number; offset?: number; includeDeleted?: boolean }
): Promise<BusinessCard[]> => {
  const result = await BusinessCardService.getByUserId(userId, options);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch business cards');
  }
  return result.cards || [];
};

export const getBusinessCardById = (id: string, userId?: string): Promise<BusinessCard | null> =>
  BusinessCardService.getById(id, userId);

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

export const deleteBusinessCard = async (
  id: string, 
  userId: string, 
  softDelete: boolean = true
): Promise<void> => {
  const result = await BusinessCardService.delete(id, userId, { softDelete });
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete business card');
  }
};

export const restoreBusinessCard = async (
  id: string, 
  userId: string
): Promise<BusinessCard> => {
  const result = await BusinessCardService.restore(id, userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to restore business card');
  }
  return result.card!;
};

// Export social links functions
export const addSocialLink = (
  businessCardId: string,
  userId: string,
  linkData: CreateSocialLinkDTO
) => BusinessCardService.addSocialLink(businessCardId, userId, linkData);

export const getSocialLinks = (businessCardId: string) =>
  BusinessCardService.getSocialLinks(businessCardId);

export const removeSocialLink = (linkId: string, userId: string) =>
  BusinessCardService.removeSocialLink(linkId, userId);

// Export additional utility functions
export const searchBusinessCards = (userId: string, query: string) =>
  BusinessCardService.search(userId, query);

export const getUserCardStats = (userId: string) =>
  BusinessCardService.getUserStats(userId);
