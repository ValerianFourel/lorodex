// types/businessCard.ts
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
  deletedAt?: string | null; // Added to match schema
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessCardDTO {
  title: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
}

export interface UpdateBusinessCardDTO extends Partial<CreateBusinessCardDTO> {}

// Additional types for social links
export interface BusinessCardSocialLink {
  id: string;
  businessCardId: string;
  platform: string;
  url: string;
  displayOrder: number;
  createdAt: string;
}

export interface CreateSocialLinkDTO {
  platform: string;
  url: string;
  displayOrder?: number;
}
