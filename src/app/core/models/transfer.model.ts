import { UnitOfMeasure } from './product.model';

export type TransferStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'REJECTED'
  | 'DISCREPANCY_REVIEW';

export interface TransferItem {
  id?: number;
  productId: string;
  productSku: string;
  productName: string;
  unit: UnitOfMeasure;
  requestedQty: number;
  dispatchedQty?: number;
  receivedQty?: number;
  discrepancyNote?: string;
}

export interface TransferEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  referenceNumber: string;
  date: string;
  fromBranchId: string;
  fromBranchName: string;
  fromWarehouseName: string;
  toBranchId: string;
  toBranchName: string;
  toWarehouseName: string;
  items: TransferItem[];
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  dispatchedBy?: string;
  receivedBy?: string;
  timeline: TransferEvent[];
  notes?: string;
}
