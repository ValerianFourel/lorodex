// lib/database-adapter.ts - Platform-specific database adapter with extensive logging
import { Platform } from 'react-native';
import { User } from '../types/auth';
import { BusinessCard } from '../types/businessCard';

console.log('🚀 database-adapter.ts: File loaded, Platform.OS =', Platform.OS);

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Dynamically import the appropriate database module
export const getDatabaseModule = async () => {
  console.log('🔄 getDatabaseModule: Starting module selection for platform:', Platform.OS);

  try {
    if (Platform.OS === 'web') {
      console.log('🌐 getDatabaseModule: Loading web database module...');
      const webModule = await import('./database-web');
      console.log('✅ getDatabaseModule: Web database module loaded successfully');
      console.log('🔍 getDatabaseModule: Web module exports:', Object.keys(webModule));
      return webModule;
    } else {
      console.log('📱 getDatabaseModule: Loading production database module...');
      const prodModule = await import('./database-production');
      console.log('✅ getDatabaseModule: Production database module loaded successfully');
      console.log('🔍 getDatabaseModule: Production module exports:', Object.keys(prodModule));
      return prodModule;
    }
  } catch (error) {
    console.error('❌ getDatabaseModule: Failed to load database module:', getErrorMessage(error));
    console.error('❌ getDatabaseModule: Error stack:', error);
    throw new Error(`Failed to load database module for ${Platform.OS}: ${getErrorMessage(error)}`);
  }
};

// User operations with proper typing
export const createUser = async (userData: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}): Promise<User> => {
  console.log('👤 createUser: Starting for email:', userData.email);
  try {
    const db = await getDatabaseModule();
    console.log('👤 createUser: Database module loaded, calling createUser...');
    const result = await db.createUser(userData);
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
    const db = await getDatabaseModule();
    console.log('👤 getUserByEmail: Database module loaded, calling getUserByEmail...');
    const result = await db.getUserByEmail(email);
    console.log('✅ getUserByEmail: Result:', result ? 'User found' : 'User not found');
    return result;
  } catch (error) {
    console.error('❌ getUserByEmail: Failed to get user:', getErrorMessage(error));
    console.error('❌ getUserByEmail: Error stack:', error);
    throw error;
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  console.log('👤 getUserById: Starting for id:', id);
  try {
    const db = await getDatabaseModule();
    console.log('👤 getUserById: Database module loaded, calling getUserById...');
    const result = await db.getUserById(id);
    console.log('✅ getUserById: Result:', result ? 'User found' : 'User not found');
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
    const db = await getDatabaseModule();
    console.log('👤 getUserWithPassword: Database module loaded, calling getUserWithPassword...');
    const result = await db.getUserWithPassword(email);
    console.log('✅ getUserWithPassword: Result:', result ? 'User with password found' : 'User not found');
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
    const db = await getDatabaseModule();
    console.log('👤 updateUserLastLogin: Database module loaded, calling updateUserLastLogin...');
    await db.updateUserLastLogin(userId);
    console.log('✅ updateUserLastLogin: Last login updated successfully');
  } catch (error) {
    console.error('❌ updateUserLastLogin: Failed to update last login:', getErrorMessage(error));
    console.error('❌ updateUserLastLogin: Error stack:', error);
    throw error;
  }
};

export const updateUserPassword = async (userId: string, passwordHash: string): Promise<void> => {
  console.log('👤 updateUserPassword: Starting for userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('👤 updateUserPassword: Database module loaded, checking if function exists...');

    // Check if the function exists (only in production database)
    if ('updateUserPassword' in db) {
      console.log('👤 updateUserPassword: Function exists, calling updateUserPassword...');
      await (db as any).updateUserPassword(userId, passwordHash);
      console.log('✅ updateUserPassword: Password updated successfully');
    } else {
      console.warn('⚠️ updateUserPassword: Function not implemented for web storage');
    }
  } catch (error) {
    console.error('❌ updateUserPassword: Failed to update password:', getErrorMessage(error));
    console.error('❌ updateUserPassword: Error stack:', error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  console.log('👤 getAllUsers: Starting...');
  try {
    const db = await getDatabaseModule();
    console.log('👤 getAllUsers: Database module loaded, checking if function exists...');

    // Check if the function exists (only in production database)
    if ('getAllUsers' in db) {
      console.log('👤 getAllUsers: Function exists, calling getAllUsers...');
      const result = await (db as any).getAllUsers();
      console.log('✅ getAllUsers: Retrieved', result.length, 'users');
      return result;
    } else {
      console.warn('⚠️ getAllUsers: Function not implemented for web storage, returning empty array');
      return [];
    }
  } catch (error) {
    console.error('❌ getAllUsers: Failed to get all users:', getErrorMessage(error));
    console.error('❌ getAllUsers: Error stack:', error);
    throw error;
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
  console.log('👤 createUserProfile: Starting for userId:', profileData.userId);
  try {
    const db = await getDatabaseModule();
    console.log('👤 createUserProfile: Database module loaded, checking if function exists...');

    if ('createUserProfile' in db) {
      console.log('👤 createUserProfile: Function exists, calling createUserProfile...');
      await (db as any).createUserProfile(profileData);
      console.log('✅ createUserProfile: Profile created successfully');
    } else {
      console.warn('⚠️ createUserProfile: Function not implemented for web storage');
    }
  } catch (error) {
    console.error('❌ createUserProfile: Failed to create profile:', getErrorMessage(error));
    console.error('❌ createUserProfile: Error stack:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<any | null> => {
  console.log('👤 getUserProfile: Starting for userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('👤 getUserProfile: Database module loaded, checking if function exists...');

    if ('getUserProfile' in db) {
      console.log('👤 getUserProfile: Function exists, calling getUserProfile...');
      const result = await (db as any).getUserProfile(userId);
      console.log('✅ getUserProfile: Result:', result ? 'Profile found' : 'Profile not found');
      return result;
    } else {
      console.warn('⚠️ getUserProfile: Function not implemented for web storage');
      return null;
    }
  } catch (error) {
    console.error('❌ getUserProfile: Failed to get profile:', getErrorMessage(error));
    console.error('❌ getUserProfile: Error stack:', error);
    throw error;
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
  console.log('🔐 createUserSession: Starting for userId:', sessionData.userId);
  try {
    const db = await getDatabaseModule();
    console.log('🔐 createUserSession: Database module loaded, calling createUserSession...');
    await db.createUserSession(sessionData);
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
    const db = await getDatabaseModule();
    console.log('🔐 getUserSession: Database module loaded, calling getUserSession...');
    const result = await db.getUserSession(sessionToken);
    console.log('✅ getUserSession: Result:', result ? 'Session found' : 'Session not found');
    return result;
  } catch (error) {
    console.error('❌ getUserSession: Failed to get session:', getErrorMessage(error));
    console.error('❌ getUserSession: Error stack:', error);
    throw error;
  }
};

export const updateSessionLastAccessed = async (sessionToken: string): Promise<void> => {
  console.log('🔐 updateSessionLastAccessed: Starting for token:', sessionToken.substring(0, 10) + '...');
  try {
    const db = await getDatabaseModule();
    console.log('🔐 updateSessionLastAccessed: Database module loaded, checking if function exists...');

    if ('updateSessionLastAccessed' in db) {
      console.log('🔐 updateSessionLastAccessed: Function exists, calling updateSessionLastAccessed...');
      await (db as any).updateSessionLastAccessed(sessionToken);
      console.log('✅ updateSessionLastAccessed: Session updated successfully');
    } else {
      console.warn('⚠️ updateSessionLastAccessed: Function not implemented for web storage');
    }
  } catch (error) {
    console.error('❌ updateSessionLastAccessed: Failed to update session:', getErrorMessage(error));
    console.error('❌ updateSessionLastAccessed: Error stack:', error);
    throw error;
  }
};

export const deactivateUserSession = async (sessionToken: string): Promise<void> => {
  console.log('🔐 deactivateUserSession: Starting for token:', sessionToken.substring(0, 10) + '...');
  try {
    const db = await getDatabaseModule();
    console.log('🔐 deactivateUserSession: Database module loaded, checking if function exists...');

    if ('deactivateUserSession' in db) {
      console.log('🔐 deactivateUserSession: Function exists, calling deactivateUserSession...');
      await (db as any).deactivateUserSession(sessionToken);
      console.log('✅ deactivateUserSession: Session deactivated successfully');
    } else {
      console.warn('⚠️ deactivateUserSession: Function not implemented for web storage');
    }
  } catch (error) {
    console.error('❌ deactivateUserSession: Failed to deactivate session:', getErrorMessage(error));
    console.error('❌ deactivateUserSession: Error stack:', error);
    throw error;
  }
};

export const deactivateAllUserSessions = async (userId: string, exceptToken?: string): Promise<void> => {
  console.log('🔐 deactivateAllUserSessions: Starting for userId:', userId, 'except token:', exceptToken ? exceptToken.substring(0, 10) + '...' : 'none');
  try {
    const db = await getDatabaseModule();
    console.log('🔐 deactivateAllUserSessions: Database module loaded, calling deactivateAllUserSessions...');
    await db.deactivateAllUserSessions(userId, exceptToken);
    console.log('✅ deactivateAllUserSessions: All sessions deactivated successfully');
  } catch (error) {
    console.error('❌ deactivateAllUserSessions: Failed to deactivate sessions:', getErrorMessage(error));
    console.error('❌ deactivateAllUserSessions: Error stack:', error);
    throw error;
  }
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  console.log('🔐 cleanupExpiredSessions: Starting...');
  try {
    const db = await getDatabaseModule();
    console.log('🔐 cleanupExpiredSessions: Database module loaded, calling cleanupExpiredSessions...');
    await db.cleanupExpiredSessions();
    console.log('✅ cleanupExpiredSessions: Expired sessions cleaned up successfully');
  } catch (error) {
    console.error('❌ cleanupExpiredSessions: Failed to cleanup sessions:', getErrorMessage(error));
    console.error('❌ cleanupExpiredSessions: Error stack:', error);
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
    const db = await getDatabaseModule();
    console.log('💼 createBusinessCard: Database module loaded, calling createBusinessCard...');
    const result = await db.createBusinessCard(cardData);
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
    const db = await getDatabaseModule();
    console.log('💼 getBusinessCardsByUserId: Database module loaded, calling getBusinessCardsByUserId...');
    const result = await db.getBusinessCardsByUserId(userId, options);
    console.log('✅ getBusinessCardsByUserId: Retrieved', result.cards.length, 'cards, total:', result.total);
    return result;
  } catch (error) {
    console.error('❌ getBusinessCardsByUserId: Failed to get business cards:', getErrorMessage(error));
    console.error('❌ getBusinessCardsByUserId: Error stack:', error);
    throw error;
  }
};

export const getBusinessCardById = async (id: string, userId?: string): Promise<BusinessCard | null> => {
  console.log('💼 getBusinessCardById: Starting for id:', id, 'userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('💼 getBusinessCardById: Database module loaded, checking if function exists...');

    if ('getBusinessCardById' in db) {
      console.log('💼 getBusinessCardById: Function exists, calling getBusinessCardById...');
      const result = await (db as any).getBusinessCardById(id, userId);
      console.log('✅ getBusinessCardById: Result:', result ? 'Card found' : 'Card not found');
      return result;
    } else {
      console.log('💼 getBusinessCardById: Function not available, using fallback method...');
      // For web, implement a simple version
      const { cards } = await getBusinessCardsByUserId(userId || '');
      const result = cards.find(card => card.id === id) || null;
      console.log('✅ getBusinessCardById: Fallback result:', result ? 'Card found' : 'Card not found');
      return result;
    }
  } catch (error) {
    console.error('❌ getBusinessCardById: Failed to get business card:', getErrorMessage(error));
    console.error('❌ getBusinessCardById: Error stack:', error);
    throw error;
  }
};

export const updateBusinessCard = async (
  id: string,
  userId: string,
  updates: Partial<Omit<BusinessCard, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
): Promise<BusinessCard | null> => {
  console.log('💼 updateBusinessCard: Starting for id:', id, 'userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('💼 updateBusinessCard: Database module loaded, checking if function exists...');

    if ('updateBusinessCard' in db) {
      console.log('💼 updateBusinessCard: Function exists, calling updateBusinessCard...');
      const result = await (db as any).updateBusinessCard(id, userId, updates);
      console.log('✅ updateBusinessCard: Card updated successfully');
      return result;
    } else {
      console.warn('⚠️ updateBusinessCard: Function not implemented for web storage');
      return null;
    }
  } catch (error) {
    console.error('❌ updateBusinessCard: Failed to update business card:', getErrorMessage(error));
    console.error('❌ updateBusinessCard: Error stack:', error);
    throw error;
  }
};

export const softDeleteBusinessCard = async (id: string, userId: string): Promise<boolean> => {
  console.log('💼 softDeleteBusinessCard: Starting for id:', id, 'userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('💼 softDeleteBusinessCard: Database module loaded, checking if function exists...');

    if ('softDeleteBusinessCard' in db) {
      console.log('💼 softDeleteBusinessCard: Function exists, calling softDeleteBusinessCard...');
      const result = await (db as any).softDeleteBusinessCard(id, userId);
      console.log('✅ softDeleteBusinessCard: Card soft deleted successfully');
      return result;
    } else {
      console.warn('⚠️ softDeleteBusinessCard: Function not implemented for web storage');
      return false;
    }
  } catch (error) {
    console.error('❌ softDeleteBusinessCard: Failed to soft delete business card:', getErrorMessage(error));
    console.error('❌ softDeleteBusinessCard: Error stack:', error);
    throw error;
  }
};

export const restoreBusinessCard = async (id: string, userId: string): Promise<boolean> => {
  console.log('💼 restoreBusinessCard: Starting for id:', id, 'userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('💼 restoreBusinessCard: Database module loaded, checking if function exists...');

    if ('restoreBusinessCard' in db) {
      console.log('💼 restoreBusinessCard: Function exists, calling restoreBusinessCard...');
      const result = await (db as any).restoreBusinessCard(id, userId);
      console.log('✅ restoreBusinessCard: Card restored successfully');
      return result;
    } else {
      console.warn('⚠️ restoreBusinessCard: Function not implemented for web storage');
      return false;
    }
  } catch (error) {
    console.error('❌ restoreBusinessCard: Failed to restore business card:', getErrorMessage(error));
    console.error('❌ restoreBusinessCard: Error stack:', error);
    throw error;
  }
};

export const deleteBusinessCard = async (id: string, userId: string): Promise<boolean> => {
  console.log('💼 deleteBusinessCard: Starting for id:', id, 'userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('💼 deleteBusinessCard: Database module loaded, checking if function exists...');

    if ('deleteBusinessCard' in db) {
      console.log('💼 deleteBusinessCard: Function exists, calling deleteBusinessCard...');
      const result = await (db as any).deleteBusinessCard(id, userId);
      console.log('✅ deleteBusinessCard: Card deleted successfully');
      return result;
    } else {
      console.warn('⚠️ deleteBusinessCard: Function not implemented for web storage');
      return false;
    }
  } catch (error) {
    console.error('❌ deleteBusinessCard: Failed to delete business card:', getErrorMessage(error));
    console.error('❌ deleteBusinessCard: Error stack:', error);
    throw error;
  }
};

export const searchBusinessCards = async (
  userId: string,
  searchTerm: string,
  limit: number = 20
): Promise<BusinessCard[]> => {
  console.log('💼 searchBusinessCards: Starting for userId:', userId, 'searchTerm:', searchTerm, 'limit:', limit);
  try {
    const db = await getDatabaseModule();
    console.log('💼 searchBusinessCards: Database module loaded, checking if function exists...');

    if ('searchBusinessCards' in db) {
      console.log('💼 searchBusinessCards: Function exists, calling searchBusinessCards...');
      const result = await (db as any).searchBusinessCards(userId, searchTerm, limit);
      console.log('✅ searchBusinessCards: Found', result.length, 'matching cards');
      return result;
    } else {
      console.log('💼 searchBusinessCards: Function not available, using fallback method...');
      // For web, implement simple search
      const { cards } = await getBusinessCardsByUserId(userId);
      const result = cards.filter(card => 
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.company && card.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (card.email && card.email.toLowerCase().includes(searchTerm.toLowerCase()))
      ).slice(0, limit);
      console.log('✅ searchBusinessCards: Fallback search found', result.length, 'matching cards');
      return result;
    }
  } catch (error) {
    console.error('❌ searchBusinessCards: Failed to search business cards:', getErrorMessage(error));
    console.error('❌ searchBusinessCards: Error stack:', error);
    throw error;
  }
};

// Social Links operations
export const createSocialLink = async (linkData: {
  id: string;
  businessCardId: string;
  platform: string;
  url: string;
  displayOrder?: number;
}): Promise<any> => {
  console.log('🔗 createSocialLink: Starting for cardId:', linkData.businessCardId, 'platform:', linkData.platform);
  try {
    const db = await getDatabaseModule();
    console.log('🔗 createSocialLink: Database module loaded, checking if function exists...');

    if ('createSocialLink' in db) {
      console.log('🔗 createSocialLink: Function exists, calling createSocialLink...');
      const result = await (db as any).createSocialLink(linkData);
      console.log('✅ createSocialLink: Social link created successfully');
      return result;
    } else {
      console.warn('⚠️ createSocialLink: Function not implemented for web storage');
      return null;
    }
  } catch (error) {
    console.error('❌ createSocialLink: Failed to create social link:', getErrorMessage(error));
    console.error('❌ createSocialLink: Error stack:', error);
    throw error;
  }
};

export const getSocialLinksByCardId = async (businessCardId: string): Promise<any[]> => {
  console.log('🔗 getSocialLinksByCardId: Starting for cardId:', businessCardId);
  try {
    const db = await getDatabaseModule();
    console.log('🔗 getSocialLinksByCardId: Database module loaded, checking if function exists...');

    if ('getSocialLinksByCardId' in db) {
      console.log('🔗 getSocialLinksByCardId: Function exists, calling getSocialLinksByCardId...');
      const result = await (db as any).getSocialLinksByCardId(businessCardId);
      console.log('✅ getSocialLinksByCardId: Retrieved', result.length, 'social links');
      return result;
    } else {
      console.warn('⚠️ getSocialLinksByCardId: Function not implemented for web storage');
      return [];
    }
  } catch (error) {
    console.error('❌ getSocialLinksByCardId: Failed to get social links:', getErrorMessage(error));
    console.error('❌ getSocialLinksByCardId: Error stack:', error);
    throw error;
  }
};

export const deleteSocialLink = async (id: string): Promise<boolean> => {
  console.log('🔗 deleteSocialLink: Starting for id:', id);
  try {
    const db = await getDatabaseModule();
    console.log('🔗 deleteSocialLink: Database module loaded, checking if function exists...');

    if ('deleteSocialLink' in db) {
      console.log('🔗 deleteSocialLink: Function exists, calling deleteSocialLink...');
      const result = await (db as any).deleteSocialLink(id);
      console.log('✅ deleteSocialLink: Social link deleted successfully');
      return result;
    } else {
      console.warn('⚠️ deleteSocialLink: Function not implemented for web storage');
      return false;
    }
  } catch (error) {
    console.error('❌ deleteSocialLink: Failed to delete social link:', getErrorMessage(error));
    console.error('❌ deleteSocialLink: Error stack:', error);
    throw error;
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
  console.log('📞 createContact: Starting for userId:', contactData.userId, 'cardId:', contactData.businessCardId);
  try {
    const db = await getDatabaseModule();
    console.log('📞 createContact: Database module loaded, checking if function exists...');

    if ('createContact' in db) {
      console.log('📞 createContact: Function exists, calling createContact...');
      await (db as any).createContact(contactData);
      console.log('✅ createContact: Contact created successfully');
    } else {
      console.warn('⚠️ createContact: Function not implemented for web storage');
    }
  } catch (error) {
    console.error('❌ createContact: Failed to create contact:', getErrorMessage(error));
    console.error('❌ createContact: Error stack:', error);
    throw error;
  }
};

export const getContactsByUserId = async (userId: string): Promise<any[]> => {
  console.log('📞 getContactsByUserId: Starting for userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('📞 getContactsByUserId: Database module loaded, checking if function exists...');

    if ('getContactsByUserId' in db) {
      console.log('📞 getContactsByUserId: Function exists, calling getContactsByUserId...');
      const result = await (db as any).getContactsByUserId(userId);
      console.log('✅ getContactsByUserId: Retrieved', result.length, 'contacts');
      return result;
    } else {
      console.warn('⚠️ getContactsByUserId: Function not implemented for web storage');
      return [];
    }
  } catch (error) {
    console.error('❌ getContactsByUserId: Failed to get contacts:', getErrorMessage(error));
    console.error('❌ getContactsByUserId: Error stack:', error);
    throw error;
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
  console.log('🔄 createCardExchange: Starting for senderId:', exchangeData.senderId, 'cardId:', exchangeData.businessCardId);
  try {
    const db = await getDatabaseModule();
    console.log('🔄 createCardExchange: Database module loaded, checking if function exists...');

    if ('createCardExchange' in db) {
      console.log('🔄 createCardExchange: Function exists, calling createCardExchange...');
      await (db as any).createCardExchange(exchangeData);
      console.log('✅ createCardExchange: Card exchange created successfully');
    } else {
      console.warn('⚠️ createCardExchange: Function not implemented for web storage');
    }
  } catch (error) {
    console.error('❌ createCardExchange: Failed to create card exchange:', getErrorMessage(error));
    console.error('❌ createCardExchange: Error stack:', error);
    throw error;
  }
};

export const getCardExchangesByUserId = async (userId: string): Promise<any[]> => {
  console.log('🔄 getCardExchangesByUserId: Starting for userId:', userId);
  try {
    const db = await getDatabaseModule();
    console.log('🔄 getCardExchangesByUserId: Database module loaded, checking if function exists...');

    if ('getCardExchangesByUserId' in db) {
      console.log('🔄 getCardExchangesByUserId: Function exists, calling getCardExchangesByUserId...');
      const result = await (db as any).getCardExchangesByUserId(userId);
      console.log('✅ getCardExchangesByUserId: Retrieved', result.length, 'exchanges');
      return result;
    } else {
      console.warn('⚠️ getCardExchangesByUserId: Function not implemented for web storage');
      return [];
    }
  } catch (error) {
    console.error('❌ getCardExchangesByUserId: Failed to get card exchanges:', getErrorMessage(error));
    console.error('❌ getCardExchangesByUserId: Error stack:', error);
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
    const db = await getDatabaseModule();
    console.log('📊 getUserStats: Database module loaded, calling getUserStats...');
    const result = await db.getUserStats(userId);
    console.log('✅ getUserStats: Stats retrieved:', result);
    return result;
  } catch (error) {
    console.error('❌ getUserStats: Failed to get user stats:', getErrorMessage(error));
    console.error('❌ getUserStats: Error stack:', error);
    throw error;
  }
};

export const getTableCounts = async (): Promise<Record<string, number>> => {
  console.log('📊 getTableCounts: Starting...');
  try {
    const db = await getDatabaseModule();
    console.log('📊 getTableCounts: Database module loaded, calling getTableCounts...');
    const result = await db.getTableCounts();
    console.log('✅ getTableCounts: Table counts retrieved:', result);
    return result;
  } catch (error) {
    console.error('❌ getTableCounts: Failed to get table counts:', getErrorMessage(error));
    console.error('❌ getTableCounts: Error stack:', error);
    throw error;
  }
};

// Utility functions
export const closePool = async (): Promise<void> => {
  console.log('🔌 closePool: Starting...');
  try {
    const db = await getDatabaseModule();
    console.log('🔌 closePool: Database module loaded, calling closePool...');
    await db.closePool();
    console.log('✅ closePool: Database pool closed successfully');
  } catch (error) {
    console.error('❌ closePool: Failed to close pool:', getErrorMessage(error));
    console.error('❌ closePool: Error stack:', error);
    throw error;
  }
};

export const checkConnection = async (): Promise<boolean> => {
  console.log('🔍 checkConnection: Starting...');
  try {
    const db = await getDatabaseModule();
    console.log('🔍 checkConnection: Database module loaded, calling checkConnection...');
    const result = await db.checkConnection();
    console.log('✅ checkConnection: Connection check result:', result);
    return result;
  } catch (error) {
    console.error('❌ checkConnection: Failed to check connection:', getErrorMessage(error));
    console.error('❌ checkConnection: Error stack:', error);
    return false;
  }
};

export const initializeDatabase = async (): Promise<void> => {
  console.log('🚀 initializeDatabase: Starting...');
  try {
    const db = await getDatabaseModule();
    console.log('🚀 initializeDatabase: Database module loaded, calling initializeDatabase...');
    await db.initializeDatabase();
    console.log('✅ initializeDatabase: Database initialized successfully');
  } catch (error) {
    console.error('❌ initializeDatabase: Failed to initialize database:', getErrorMessage(error));
    console.error('❌ initializeDatabase: Error stack:', error);
    throw error;
  }
};

// Transaction wrapper (only available in production)
export const withTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  console.log('🔄 withTransaction: Starting...');
  try {
    const db = await getDatabaseModule();
    console.log('🔄 withTransaction: Database module loaded, checking if function exists...');

    if ('withTransaction' in db) {
      console.log('🔄 withTransaction: Function exists, calling withTransaction...');
      const result = await (db as any).withTransaction(callback);
      console.log('✅ withTransaction: Transaction completed successfully');
      return result;
    } else {
      console.log('🔄 withTransaction: Function not available, executing callback without transaction...');
      // For web, just execute the callback without transaction
      const result = await callback(null);
      console.log('✅ withTransaction: Callback executed without transaction');
      return result;
    }
  } catch (error) {
    console.error('❌ withTransaction: Transaction failed:', getErrorMessage(error));
    console.error('❌ withTransaction: Error stack:', error);
    throw error;
  }
};

// Additional utility functions
export const refreshUser = async (userId: string): Promise<User | null> => {
  console.log('🔄 refreshUser: Starting for userId:', userId);
  try {
    const result = await getUserById(userId);
    console.log('✅ refreshUser: User refreshed:', result ? 'Success' : 'User not found');
    return result;
  } catch (error) {
    console.error('❌ refreshUser: Failed to refresh user:', getErrorMessage(error));
    console.error('❌ refreshUser: Error stack:', error);
    throw error;
  }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  console.log('🏥 checkDatabaseHealth: Starting...');
  try {
    const result = await checkConnection();
    console.log('✅ checkDatabaseHealth: Health check result:', result);
    return result;
  } catch (error) {
    console.error('❌ checkDatabaseHealth: Health check failed:', getErrorMessage(error));
    console.error('❌ checkDatabaseHealth: Error stack:', error);
    return false;
  }
};

console.log('✅ database-adapter.ts: File fully loaded and all exports defined');
