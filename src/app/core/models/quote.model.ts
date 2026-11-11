export type ServiceCategory = 
  | 'PRINTING_PRESS'
  | 'BRANDING_PROMOTION'
  | 'GARMENT_MATERIALS'
  | 'PRINTING_SUPPLIES'
  | 'EQUIPMENT_DISTRIBUTION';

export type QuoteStatus = 
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'DECLINED';

export interface QuotationRequest {
  id: string;
  quoteNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName?: string;
  serviceCategory: ServiceCategory;
  serviceCategoryLabel: string;
  projectTitle: string;
  specifications: string;
  quantity: number;
  unit: string;
  targetTimeline?: string;
  deliveryPreference: 'PICKUP' | 'DELIVERY';
  branchPreference?: string;
  status: QuoteStatus;
  estimatedAmount?: number;
  quotedPrice?: number;
  estimatedCost?: number;
  netRevenue?: number;
  notes?: string;
}

export interface AserServiceItem {
  id: string;
  code: string;
  title: string;
  category: ServiceCategory;
  categoryLabel: string;
  description: string;
  icon: string;
  imageUrl?: string;
  images?: string[];
  features: string[];
  requiresQuotation: boolean;
  isActive: boolean;
}
