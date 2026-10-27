import { UnitOfMeasure } from './product.model';

export interface Warehouse {
  id: string;
  branchId: string;
  name: string;
  code: string;
  isDefault?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  isHeadOffice?: boolean;
  warehouses: Warehouse[];
}

export type StockStatus = 'In stock' | 'Low stock' | 'Out of stock';

export interface StockBalance {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  unit: UnitOfMeasure;
  weightedAvgCost: number;
  totalValuation: number;
  reorderPoint: number;
  status: StockStatus;
}

export type MovementType = 
  | 'RECEIPT' 
  | 'ISSUE' 
  | 'TRANSFER_OUT' 
  | 'TRANSFER_IN' 
  | 'ADJUSTMENT' 
  | 'RESERVATION';

export type MovementReference = 
  | 'PURCHASE_ORDER' 
  | 'OPENING_STOCK' 
  | 'SALES_ORDER' 
  | 'INTER_BRANCH_TRANSFER' 
  | 'PHYSICAL_COUNT' 
  | 'MANUAL_ADJUSTMENT';

export interface StockMovement {
  id: string;
  timestamp: string;
  type: MovementType;
  productId: string;
  productSku: string;
  productName: string;
  branchId: string;
  branchName: string;
  warehouseName: string;
  quantityDelta: number;
  unit: UnitOfMeasure;
  unitCost?: number;
  totalCost?: number;
  referenceType: MovementReference;
  referenceNumber: string;
  actor: string;
  notes?: string;
}

export interface StockReceiptCommand {
  productId: string;
  branchId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  supplierName: string;
  referenceNumber: string;
  actor: string;
  notes?: string;
}
