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

