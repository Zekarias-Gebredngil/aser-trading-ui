export type ProductCategory = 
  | 'PRINTING_SERVICES'
  | 'BRANDING_PROMOTION'
  | 'GARMENT_MATERIALS'
  | 'PRINTING_SUPPLIES'
  | 'EQUIPMENT';

export type ProductAvailability = 
  | 'IN_STOCK'
  | 'LIMITED'
  | 'OUT_OF_STOCK'
  | 'ON_REQUEST';

export type UnitOfMeasure = 
  | 'piece'
  | 'meter'
  | 'roll'
  | 'kg'
  | 'ream'
  | 'box'
  | 'pack'
  | 'liter'
  | 'set';

export type PricingType = 'FIXED' | 'QUOTATION';

export interface Product {
  id: string;
  sku: string;
  name: string;
  amharicName?: string;
  category: ProductCategory;
  categoryLabel: string;
  description: string;
  unit: UnitOfMeasure;
  pricingType: PricingType;
  unitPrice: number;
  baseCost: number;
  availability: ProductAvailability;
  minOrderQty: number;
  reorderThreshold: number;
  isPublished: boolean;
  featured: boolean;
  imageUrl?: string;
  images?: string[];
  badge?: string;
  specifications: Record<string, string>;
  eligibleBranches: string[];
}
