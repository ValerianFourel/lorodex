// lib/businessCards.ts
import { withDatabase } from './database';
import { BusinessCard, CreateBusinessCardDTO, UpdateBusinessCardDTO } from '../types/businessCard';

export class BusinessCardService {

  // Create a new business card
  static async create(userId: string, cardData: CreateBusinessCardDTO): Promise<BusinessCard> {
    try {
      return await withDatabase(async (db) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();

        await db.runAsync(
          `INSERT INTO business_cards (id, user_id, title, company, email, phone, website, address, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            userId,
            cardData.title,
            cardData.company || null,
            cardData.email || null,
            cardData.phone || null,
            cardData.website || null,
            cardData.address || null,
            cardData.notes || null,
            now,
            now
          ]
        );

        // Fetch and return the created card
        const card = await this.getById(id);
        if (!card) {
          throw new Error('Failed to retrieve created card');
        }

        return card;
      });
    } catch (error) {
      console.error('Error creating business card:', error);
      throw new Error('Failed to create business card');
    }
  }

  // Get all business cards for a user
  static async getByUserId(userId: string): Promise<BusinessCard[]> {
    try {
      return await withDatabase(async (db) => {
        const result = await db.getAllAsync(
          `SELECT * FROM business_cards WHERE user_id = ? ORDER BY created_at DESC`,
          [userId]
        );

        return result.map(this.mapRowToBusinessCard);
      });
    } catch (error) {
      console.error('Error fetching business cards:', error);
      throw new Error('Failed to fetch business cards');
    }
  }

  // Get a single business card by ID
  static async getById(id: string): Promise<BusinessCard | null> {
    try {
      return await withDatabase(async (db) => {
        const result = await db.getFirstAsync(
          `SELECT * FROM business_cards WHERE id = ?`,
          [id]
        );

        return result ? this.mapRowToBusinessCard(result as any) : null;
      });
    } catch (error) {
      console.error('Error fetching business card:', error);
      throw new Error('Failed to fetch business card');
    }
  }

  // Update a business card
  static async update(id: string, userId: string, updates: UpdateBusinessCardDTO): Promise<BusinessCard> {
    try {
      return await withDatabase(async (db) => {
        const now = new Date().toISOString();

        const setClause = [];
        const values = [];

        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            setClause.push(`${key} = ?`);
            values.push(value);
          }
        });

        if (setClause.length === 0) {
          throw new Error('No updates provided');
        }

        setClause.push('updated_at = ?');
        values.push(now);
        values.push(id);
        values.push(userId);

        await db.runAsync(
          `UPDATE business_cards SET ${setClause.join(', ')} WHERE id = ? AND user_id = ?`,
          values
        );

        const updatedCard = await this.getById(id);
        if (!updatedCard) {
          throw new Error('Card not found after update');
        }

        return updatedCard;
      });
    } catch (error) {
      console.error('Error updating business card:', error);
      throw new Error('Failed to update business card');
    }
  }

  // Delete a business card
  static async delete(id: string, userId: string): Promise<void> {
    try {
      await withDatabase(async (db) => {
        const result = await db.runAsync(
          `DELETE FROM business_cards WHERE id = ? AND user_id = ?`,
          [id, userId]
        );

        if (result.changes === 0) {
          throw new Error('Card not found or not owned by user');
        }
      });
    } catch (error) {
      console.error('Error deleting business card:', error);
      throw new Error('Failed to delete business card');
    }
  }

  // Helper method to map database row to BusinessCard object
  private static mapRowToBusinessCard(row: any): BusinessCard {
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
}
