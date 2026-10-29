import { UnitOfMeasure } from './product.model';

export type OrderStatus = 
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_DISPATCH'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type PaymentStatus = 
  | 'PENDING'
  | 'VERIFIED'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod = 
  | 'MANUAL_BANK_TRANSFER'
  | 'IN_HAND_CASH';

export type FulfillmentType = 
  | 'BRANCH_PICKUP'
  | 'DELIVERY';

export interface OrderItem {
  productId: string;
  productSku: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: UnitOfMeasure;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName?: string;
  fulfillment: FulfillmentType;
  pickupBranchId?: string;
  pickupBranchName?: string;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  notes?: string;
  reservedStock: boolean;
}
