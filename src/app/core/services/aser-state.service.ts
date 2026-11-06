import { Injectable, computed, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { AuthApiService, AuthResponse } from './api/auth-api.service';
import { CatalogApiService } from './api/catalog-api.service';
import { BranchApiService } from './api/branch-api.service';
import { OrderApiService, BackendCreateOrderRequest } from './api/order-api.service';
import { InventoryApiService } from './api/inventory-api.service';
import { TransferApiService } from './api/transfer-api.service';
import { InquiryApiService } from './api/inquiry-api.service';
import { UserApiService } from './api/user-api.service';
import { ReportApiService, SalesReportDto, StockSummaryReportDto, StockValuationReportDto, TransferReportDto } from './api/report-api.service';
import { CategoryApiService, BackendCategoryDto } from './api/category-api.service';
import { UnitApiService, BackendUnitDto } from './api/unit-api.service';
import { AuditApiService, BackendAuditLogDto } from './api/audit-api.service';
import { ProcurementApiService, BackendSupplierDto, BackendPurchaseOrderDto } from './api/procurement-api.service';
import { MigrationApiService } from './api/migration-api.service';
import { BackendLowStockAlertDto } from './api/inventory-api.service';
import { Product, ProductCategory, ProductAvailability, UnitOfMeasure } from '../models/product.model';
import { Branch, StockBalance, StockMovement, StockReceiptCommand } from '../models/inventory.model';
import { StockTransfer, TransferEvent, TransferStatus } from '../models/transfer.model';
import { FulfillmentType, Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '../models/order.model';
import { QuotationRequest, AserServiceItem, ServiceCategory } from '../models/quote.model';
import { EmployeeUser, StaffRole, Permission, ROLE_LABELS, ROLE_PERMISSIONS } from '../models/user.model';

export interface CartItem {
  product: Product;
  quantity: number;
  lineTotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class AserStateService {
  private readonly toastService = inject(ToastService);
  private readonly authApi = inject(AuthApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly branchApi = inject(BranchApiService);
  private readonly orderApi = inject(OrderApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly transferApi = inject(TransferApiService);
  private readonly inquiryApi = inject(InquiryApiService);
  private readonly userApi = inject(UserApiService);
  private readonly reportApi = inject(ReportApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly unitApi = inject(UnitApiService);
  private readonly auditApi = inject(AuditApiService);
  private readonly procurementApi = inject(ProcurementApiService);
  private readonly migrationApi = inject(MigrationApiService);
  private readonly router = inject(Router);

  // Operational Synchronization Status & Enterprise System Messages
  readonly syncStatus = signal<'synced' | 'syncing' | 'queued'>('synced');
  readonly lastSyncTimestamp = signal<Date>(new Date());
  readonly systemStatusMessage = signal<string>('Enterprise cloud ledger synchronized · Central ERP Connected');

  // Backward-compatibility signals
  readonly backendConnected = computed(() => this.syncStatus() !== 'queued');
  readonly connected = this.backendConnected;
  readonly backendStatusMessage = this.systemStatusMessage;
  readonly statusMessage = this.systemStatusMessage;

  // Authenticated Employee & Role Permissions (Protected by Credentials)
  readonly currentUser = signal<EmployeeUser | null>(null);

  readonly isAuthenticated = computed<boolean>(() => this.currentUser() !== null);

  readonly currentRole = computed<StaffRole>(() => {
    const user = this.currentUser();
    return user ? user.role : ('CUSTOMER' as StaffRole);
  });

  readonly currentPermissions = computed<Permission[]>(() => {
    if (!this.isAuthenticated()) {
      return [];
    }
    const role = this.currentRole();
    return ROLE_PERMISSIONS[role] || [];
  });

  hasPermission(permission: Permission): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }
    return this.currentPermissions().includes(permission);
  }

  readonly isBranchScopeLocked = computed<boolean>(() => {
    if (!this.isAuthenticated()) return true;
    return !this.hasPermission('ACCESS_ALL_BRANCHES');
  });

  readonly selectedBranchFilter = signal<string>('ALL');

  // Master Branches & Warehouses (Dynamically loaded from backend BranchApiService)
  readonly branches = signal<Branch[]>([]);

  // Master Products (Dynamically loaded from backend CatalogApiService)
  readonly products = signal<Product[]>([]);

  // Inventory Balances (Dynamically loaded from backend InventoryApiService)
  readonly inventoryBalances = signal<StockBalance[]>([]);

  // Stock Movements Ledger (Dynamically loaded from backend InventoryApiService)
  readonly stockMovements = signal<StockMovement[]>([]);

  // Inter-Branch Stock Transfers (Dynamically loaded from backend TransferApiService)
  readonly transfers = signal<StockTransfer[]>([]);

  // E-commerce Online Orders (Dynamically loaded from backend OrderApiService)
  readonly orders = signal<Order[]>([]);

  // Quotation Requests & Technical Inquiries (Dynamically loaded from backend InquiryApiService)
  readonly quotations = signal<QuotationRequest[]>([]);

  // Centralized Reports & Analytics (from ReportApiService)
  readonly salesReport = signal<SalesReportDto | null>(null);
  readonly stockSummaryReport = signal<StockSummaryReportDto | null>(null);
  readonly stockValuationReport = signal<StockValuationReportDto | null>(null);
  readonly transferReport = signal<TransferReportDto | null>(null);

  // Master Categories, Units, Suppliers, Purchase Orders, Audit Logs & Low Stock Alerts
  readonly backendCategories = signal<BackendCategoryDto[]>([]);
  readonly backendUnits = signal<BackendUnitDto[]>([]);
  readonly suppliers = signal<BackendSupplierDto[]>([]);
  readonly purchaseOrders = signal<BackendPurchaseOrderDto[]>([]);
  readonly auditLogs = signal<BackendAuditLogDto[]>([]);
  readonly lowStockAlerts = signal<BackendLowStockAlertDto[]>([]);

  // Customer Shopping Cart (Active session cart)
  readonly cart = signal<CartItem[]>([]);

  // Computed Cart & Operational Counters
  readonly cartCount = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.quantity, 0);
  });

  readonly cartSubtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.lineTotal, 0);
  });

  // Filtered Inventory Balances by Scoped/Selected Branch
  readonly filteredInventory = computed(() => {
    const filter = this.selectedBranchFilter();
    if (filter === 'ALL') {
      return this.inventoryBalances();
    }
    return this.inventoryBalances().filter(b => b.branchId === filter);
  });

  // Filtered Inter-Branch Transfers by Scoped/Selected Branch
  readonly filteredTransfers = computed<StockTransfer[]>(() => {
    const filter = this.selectedBranchFilter();
    const all = this.transfers();
    if (filter === 'ALL') {
      return all;
    }
    return all.filter(t => t.fromBranchId === filter || t.toBranchId === filter);
  });

  // Filtered Stock Movements Ledger by Scoped/Selected Branch
  readonly filteredMovements = computed<StockMovement[]>(() => {
    const filter = this.selectedBranchFilter();
    const all = this.stockMovements();
    if (filter === 'ALL') {
      return all;
    }
    const branch = this.branches().find(b => b.id === filter);
    return all.filter(m => m.branchId === filter || (branch && m.branchName === branch.name));
  });

  // Filtered Low Stock Alerts by Scoped/Selected Branch
  readonly filteredLowStockAlerts = computed<BackendLowStockAlertDto[]>(() => {
    const filter = this.selectedBranchFilter();
    const all = this.lowStockAlerts();
    if (filter === 'ALL') {
      return all;
    }
    const branch = this.branches().find(b => b.id === filter);
    const branchWhIds = (branch?.warehouses || []).map(w => {
      const num = parseInt(w.id.replace('WH-0', '').replace('WH-', ''), 10);
      return isNaN(num) ? -1 : num;
    });
    const branchWhNames = (branch?.warehouses || []).map(w => w.name.toLowerCase());
    return all.filter(a => {
      if (a.warehouseId !== undefined) {
        return branchWhIds.includes(a.warehouseId);
      }
      return branchWhNames.includes((a.warehouseName || '').toLowerCase());
    });
  });

  readonly totalValuation = computed(() => {
    const filter = this.selectedBranchFilter();
    if (filter === 'ALL') {
      if (this.stockValuationReport() && this.stockValuationReport()!.totalValuationEtb > 0) {
        return this.stockValuationReport()!.totalValuationEtb;
      }
      return this.inventoryBalances().reduce((acc, curr) => acc + curr.totalValuation, 0);
    }
    return this.filteredInventory().reduce((acc, curr) => acc + curr.totalValuation, 0);
  });

  readonly lowStockCount = computed(() => {
    const alerts = this.filteredLowStockAlerts();
    if (alerts.length > 0) {
      return alerts.length;
    }
    return this.filteredInventory().filter(i =>
      (i.status as string)?.toLowerCase().includes('low') ||
      (i.status as string)?.toLowerCase().includes('out')
    ).length;
  });

  readonly pendingTransfersCount = computed(() => {
    return this.filteredTransfers().filter(t => t.status === 'PENDING_APPROVAL' || t.status === 'IN_TRANSIT').length;
  });

  readonly ordersTodayCount = computed(() => {
    const filter = this.selectedBranchFilter();
    if (filter === 'ALL') {
      return this.orders().length;
    }
    const branch = this.branches().find(b => b.id === filter);
    return this.orders().filter(o => !o.pickupBranchName || (branch && o.pickupBranchName.toLowerCase().includes(branch.name.toLowerCase()))).length;
  });

  // Staff & Employees (Dynamically loaded from backend UserApiService)
  readonly employees = signal<EmployeeUser[]>([]);

  // Commercial Services (Dynamically loaded from backend CatalogApiService)
  readonly services = signal<AserServiceItem[]>([]);

  readonly activeServices = computed(() => this.services().filter(s => s.isActive));

  constructor() {
    this.restoreStoredSession();
    this.initSync();
  }

  private restoreStoredSession(): void {
    const storedAuth = this.authApi.currentUser();
    if (storedAuth && this.authApi.isAuthenticated()) {
      const userRole = (storedAuth.role.replace('ROLE_', '') as StaffRole) || 'SYSTEM_ADMINISTRATOR';
      const branchId = storedAuth.assignedBranchId ? `BR-0${storedAuth.assignedBranchId}` : 'ALL';
      const branchName = this.branches().find(b => b.id === branchId)?.name || 'Consolidated Network';

      const employee: EmployeeUser = {
        id: `USR-${storedAuth.userId}`,
        username: storedAuth.username,
        email: storedAuth.email,
        fullName: storedAuth.fullName,
        role: userRole,
        roleLabel: ROLE_LABELS[userRole] || userRole,
        assignedBranchId: branchId !== 'ALL' ? branchId : undefined,
        assignedBranchName: branchName,
        isActive: true
      };

      this.currentUser.set(employee);
      if (ROLE_PERMISSIONS[userRole]?.includes('ACCESS_ALL_BRANCHES')) {
        this.selectedBranchFilter.set('ALL');
      } else {
        this.selectedBranchFilter.set(branchId);
      }
    }
  }

  initSync() {
    this.syncStatus.set('syncing');
    this.systemStatusMessage.set('Synchronizing branch network & commercial catalog...');

    this.fetchBranches();
    this.refreshPublicProducts();
    this.fetchServices();
    this.fetchCategoriesAndUnits();

    if (this.isAuthenticated()) {
      this.syncProtectedData();
    }
  }

  fetchBranches(): void {
    this.branchApi.getPublicBranches().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          const rawBranches = res.data;

          this.branchApi.getWarehouses().subscribe({
            next: (whRes) => {
              const allWarehouses = whRes.success && whRes.data ? whRes.data : [];
              const mappedBranches: Branch[] = rawBranches.map(b => {
                const branchWarehouses = allWarehouses.filter(w => w.branchId === b.id).map(w => ({
                  id: `WH-0${w.id}`,
                  branchId: `BR-0${b.id}`,
                  name: w.name,
                  code: w.code,
                  isDefault: w.isDefault
                }));

                return {
                  id: `BR-0${b.id}`,
                  name: b.name,
                  code: b.code,
                  address: b.address || '',
                  city: b.city || 'Addis Ababa',
                  phone: b.phone || '',
                  email: b.email || '',
                  isHeadOffice: b.code === 'HQ',
                  warehouses: branchWarehouses.length > 0 ? branchWarehouses : [
                    {
                      id: `WH-0${b.id}`,
                      branchId: `BR-0${b.id}`,
                      name: `${(b.name || 'Branch').split('(')[0].trim()} Warehouse`,
                      code: `WH-${b.code}`,
                      isDefault: true
                    }
                  ]
                };
              });
              this.branches.set(mappedBranches);
              this.syncStatus.set('synced');
              this.lastSyncTimestamp.set(new Date());
            },
            error: () => {
              const mappedBranches: Branch[] = rawBranches.map(b => ({
                id: `BR-0${b.id}`,
                name: b.name,
                code: b.code,
                address: b.address || '',
                city: b.city || 'Addis Ababa',
                phone: b.phone || '',
                email: b.email || '',
                isHeadOffice: b.code === 'HQ',
                warehouses: [
                  {
                    id: `WH-0${b.id}`,
                    branchId: `BR-0${b.id}`,
                    name: `${(b.name || 'Branch').split('(')[0].trim()} Warehouse`,
                    code: `WH-${b.code}`,
                    isDefault: true
                  }
                ]
              }));
              this.branches.set(mappedBranches);
              this.syncStatus.set('synced');
            }
          });
        }
      },
      error: () => {
        this.syncStatus.set('synced');
      }
    });
  }

  normalizeMediaUrl(url?: string): string {
    if (!url) return '';
    // If it's a full remote URL (S3 bucket, CloudFront, or remote CDN)
    if (url.startsWith('https://') || (url.startsWith('http://') && !url.includes('localhost:') && !url.includes('127.0.0.1:'))) {
      return url;
    }
    // If it's a localhost URL, replace hostname if accessed from another device on the network (e.g. mobile or tablet)
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const port = url.split(':')[2]?.split('/')[0] || '8085';
        const path = url.split(`:${port}`)[1] || '';
        return `${window.location.protocol}//${window.location.hostname}:${port}${path}`;
      }
      return url;
    }
    // If it's a relative backend upload path like /uploads/...
    if (url.startsWith('/uploads/')) {
      const backendOrigin = environment.apiUrl.replace('/api/v1', '');
      return `${backendOrigin}${url}`;
    }
    return url;
  }

  refreshPublicProducts(): void {
    this.catalogApi.getPublicProducts({ size: 100 }).subscribe({
      next: (prodRes) => {
        if (prodRes.success && prodRes.data?.content?.length) {
          const rawBranches = this.branches();
          const mappedProducts: Product[] = prodRes.data.content.map(p => {
            let cat: ProductCategory = 'PRINTING_SUPPLIES';
            const cName = (p.categoryName || '').toLowerCase();
            if (cName.includes('garment')) cat = 'GARMENT_MATERIALS';
            else if (cName.includes('brand')) cat = 'BRANDING_PROMOTION';
            else if (cName.includes('press') || cName.includes('service')) cat = 'PRINTING_SERVICES';
            else if (cName.includes('equip') || cName.includes('materials & equip')) cat = 'EQUIPMENT';

            const finalImage = this.normalizeMediaUrl(p.imageUrl) || '/assets/images/Aser-trading.png';
            let productImages = [finalImage];

            let parsedSpecs: Record<string, string> = {
              'Specifications': p.specifications || 'Standard Commercial Grade'
            };

            if (p.specifications) {
              try {
                const parsed = JSON.parse(p.specifications);
                if (typeof parsed === 'object' && parsed !== null) {
                  if (Array.isArray(parsed._galleryImages) && parsed._galleryImages.length > 0) {
                    productImages = parsed._galleryImages.map((img: string) => this.normalizeMediaUrl(img));
                  }
                  const cleanSpecs: Record<string, string> = {};
                  for (const [k, v] of Object.entries(parsed)) {
                    if (!k.startsWith('_')) {
                      cleanSpecs[k] = String(v);
                    }
                  }
                  if (Object.keys(cleanSpecs).length > 0) {
                    parsedSpecs = cleanSpecs;
                  }
                }
              } catch {
                parsedSpecs = { 'Specifications': p.specifications };
              }
            }

            let avail: ProductAvailability = 'IN_STOCK';
            const rawAvail = (p.availability as string) || '';
            if (rawAvail === 'OUT_OF_STOCK') {
              avail = 'OUT_OF_STOCK';
            } else if (rawAvail === 'LIMITED_AVAILABILITY' || rawAvail === 'LIMITED') {
              avail = 'LIMITED';
            } else if (rawAvail === 'AVAILABLE_ON_REQUEST' || rawAvail === 'ON_REQUEST' || p.isQuotationOnly) {
              avail = 'ON_REQUEST';
            } else {
              avail = 'IN_STOCK';
            }

            return {
              id: `PRD-${p.id}`,
              sku: p.sku,
              name: p.name,
              category: cat,
              categoryLabel: p.categoryName || 'Printing Supplies',
              description: p.description || '',
              unit: (p.baseUnitName?.toLowerCase() || p.baseUnitSymbol?.toLowerCase() || 'piece') as any,
              pricingType: p.isQuotationOnly ? 'QUOTATION' : 'FIXED',
              unitPrice: p.sellingPrice || 0,
              baseCost: (p.sellingPrice || 0) * 0.75,
              availability: avail,
              minOrderQty: 1,
              reorderThreshold: 10,
              isPublished: true,
              featured: true,
              imageUrl: finalImage,
              images: productImages,
              specifications: parsedSpecs,
              eligibleBranches: rawBranches.map(mb => mb.id)
            };
          });
          this.products.set(mappedProducts);
        }
      }
    });
  }

  fetchServices(): void {
    this.catalogApi.getPublicServices().subscribe({
      next: (srvRes) => {
        if (srvRes.success && srvRes.data?.length) {
          const mappedServices: AserServiceItem[] = srvRes.data.map(s => {
            let cat: ServiceCategory = 'PRINTING_PRESS';
            const c = (s.category || '').toLowerCase();
            if (c.includes('brand')) cat = 'BRANDING_PROMOTION';
            else if (c.includes('garment') || c.includes('textile')) cat = 'GARMENT_MATERIALS';
            else if (c.includes('equip') || c.includes('maint')) cat = 'EQUIPMENT_DISTRIBUTION';

            const icon = s.serviceCode.includes('EQUIP')
              ? 'lucide:wrench'
              : s.serviceCode.includes('GARMENT')
                ? 'lucide:shirt'
                : s.serviceCode.includes('BRAND')
                  ? 'lucide:sparkles'
                  : 'lucide:printer';

            const finalImage = this.normalizeMediaUrl(s.imageUrl) || '/assets/images/Aser-trading.png';
            const finalServiceImages = [finalImage];

            return {
              id: `SVC-${s.serviceCode}`,
              code: s.serviceCode,
              title: s.title,
              category: cat,
              categoryLabel: s.category || 'Printing Press',
              description: s.description || '',
              icon,
              imageUrl: finalImage,
              images: finalServiceImages,
              features: s.features || (s as any).capabilities || [],
              requiresQuotation: s.requiresQuotation ?? true,
              isActive: (s as any).isActive ?? true
            };
          });
          this.services.set(mappedServices);
        }
      }
    });
  }

  fetchCategoriesAndUnits(): void {
    this.categoryApi.getAllCategories().subscribe({
      next: (catRes) => {
        if (catRes.success && catRes.data) {
          this.backendCategories.set(catRes.data);
        }
      }
    });

    this.unitApi.getAllUnits().subscribe({
      next: (unitRes) => {
        if (unitRes.success && unitRes.data) {
          this.backendUnits.set(unitRes.data);
        }
      }
    });
  }

  loginAsUser(username: string, password: string, callback?: (success: boolean) => void) {
    this.authApi.login({ username, password }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const u = res.data;
          const userRole = (u.role.replace('ROLE_', '') as StaffRole) || 'SYSTEM_ADMINISTRATOR';
          const branchId = u.assignedBranchId ? `BR-0${u.assignedBranchId}` : 'ALL';
          const branchName = this.branches().find(b => b.id === branchId)?.name || 'Consolidated Network';

          const employee: EmployeeUser = {
            id: `USR-${u.userId}`,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            role: userRole,
            roleLabel: ROLE_LABELS[userRole] || userRole,
            assignedBranchId: branchId !== 'ALL' ? branchId : undefined,
            assignedBranchName: branchName,
            isActive: true
          };

          this.currentUser.set(employee);

          if (ROLE_PERMISSIONS[userRole]?.includes('ACCESS_ALL_BRANCHES')) {
            this.selectedBranchFilter.set('ALL');
          } else {
            this.selectedBranchFilter.set(branchId);
          }

          this.toastService.success(
            `Authenticated as ${employee.fullName}`,
            `Role: ${employee.roleLabel}. Assigned: ${branchName}`
          );

          this.syncProtectedData();
          if (callback) callback(true);
        } else {
          if (callback) callback(false);
        }
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Invalid username or password. Please verify your credentials.';
        this.toastService.error('Sign-in Failed', errorMsg);
        if (callback) callback(false);
      }
    });
  }

  logoutStaff() {
    this.authApi.logout();
    this.currentUser.set(null);
    this.selectedBranchFilter.set('ALL');
    this.inventoryBalances.set([]);
    this.stockMovements.set([]);
    this.transfers.set([]);
    this.orders.set([]);
    this.quotations.set([]);
    this.employees.set([]);
    this.toastService.info('Session Ended', 'You have been  signed out of the system.');
    this.router.navigate(['/app/login']);
  }

  syncProtectedData() {
    if (!this.isAuthenticated()) return;

    // 1. Staff with MANAGE_EMPLOYEES permission can access staff roster
    if (this.hasPermission('MANAGE_EMPLOYEES')) {
      this.userApi.getUsers().subscribe({
        next: (res) => {
          if (res.success && res.data?.content?.length) {
            const mappedUsers: EmployeeUser[] = res.data.content.map(u => ({
              id: `USR-${u.id}`,
              username: u.username,
              email: u.email,
              fullName: u.fullName,
              phone: u.phone,
              role: (u.role.replace('ROLE_', '') as StaffRole) || 'SYSTEM_ADMINISTRATOR',
              roleLabel: ROLE_LABELS[(u.role.replace('ROLE_', '') as StaffRole)] || u.role,
              assignedBranchId: u.assignedBranchId ? `BR-0${u.assignedBranchId}` : undefined,
              assignedBranchName: u.assignedBranchName || (u.assignedBranchId ? this.branches().find(b => b.id === `BR-0${u.assignedBranchId}`)?.name : 'Consolidated HQ'),
              isActive: u.isActive,
              createdAt: u.createdAt || 'Active'
            }));
            this.employees.set(mappedUsers);
          }
        }
      });
    }

    // 2. Staff with VIEW_INVENTORY permission can access live inventory balances & movement ledger
    if (this.hasPermission('VIEW_INVENTORY')) {
      this.inventoryApi.getBalances().subscribe({
        next: (res) => {
          if (res.success && res.data?.content?.length) {
            const mappedBalances: StockBalance[] = res.data.content.map(b => {
              const onHand = Number(b.onHandQuantity ?? 0);
              const reserved = Number(b.reservedQuantity ?? 0);
              const available = Number(b.availableQuantity ?? (onHand - reserved));
              const reorder = 10;
              let computedStatus: 'In stock' | 'Low stock' | 'Out of stock' = 'In stock';
              if (b.status === 'IN_STOCK') {
                computedStatus = 'In stock';
              } else if (b.status === 'LOW_STOCK') {
                computedStatus = 'Low stock';
              } else if (b.status === 'OUT_OF_STOCK') {
                computedStatus = 'Out of stock';
              } else {
                computedStatus = available <= 0 ? 'Out of stock' : available <= reorder ? 'Low stock' : 'In stock';
              }

              return {
                id: `BAL-${b.id}`,
                productId: `PRD-${b.productId}`,
                productSku: b.productSku,
                productName: b.productName,
                category: b.categoryName || 'General',
                branchId: b.branchId ? (b.branchId < 10 ? `BR-0${b.branchId}` : `BR-${b.branchId}`) : 'BR-01',
                branchName: b.branchName || 'Main Branch',
                warehouseId: `WH-${b.warehouseId}`,
                warehouseName: b.warehouseName,
                onHandQty: onHand,
                reservedQty: reserved,
                availableQty: available,
                weightedAvgCost: Number(b.weightedAverageCost ?? 0),
                totalValuation: Number(b.totalValuation ?? (onHand * Number(b.weightedAverageCost ?? 0))),
                reorderPoint: reorder,
                unit: (b.unitSymbol?.toLowerCase() || 'piece') as any,
                status: computedStatus
              };
            });
            this.inventoryBalances.set(mappedBalances);
          }
        }
      });

      this.inventoryApi.getMovements().subscribe({
        next: (res) => {
          if (res.success && res.data?.content?.length) {
            const mappedMovements: StockMovement[] = res.data.content.map(m => ({
              id: `MOV-${m.id}`,
              timestamp: m.timestamp,
              type: m.movementType as any,
              productId: `PRD-${m.productId}`,
              productSku: m.productSku,
              productName: m.productName,
              branchId: 'BR-01',
              branchName: m.branchName,
              warehouseName: m.warehouseName,
              quantityDelta: m.quantityDelta,
              unit: (m.unitSymbol?.toLowerCase() || 'piece') as any,
              unitCost: m.unitCost,
              totalCost: m.totalCost,
              referenceType: m.referenceType as any,
              referenceNumber: m.referenceId,
              actor: m.actor,
              notes: m.notes
            }));
            this.stockMovements.set(mappedMovements);
          }
        }
      });
    }

    // 3. Staff with MANAGE_ORDERS permission can access online customer orders
    if (this.hasPermission('MANAGE_ORDERS')) {
      this.orderApi.getOrders().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const list = res.data.content || [];
            const mappedOrders: Order[] = list.map(o => ({
              id: `ORD-${o.id}`,
              orderNumber: o.orderNumber,
              createdAt: o.createdAt,
              customerName: o.customerName,
              customerPhone: o.customerPhone || '',
              customerEmail: o.customerEmail,
              fulfillment: (o.deliveryType === 'STORE_PICKUP' || (o.deliveryType as string) === 'COLLECTION') ? 'BRANCH_PICKUP' : 'DELIVERY',
              pickupBranchId: o.collectionBranchId ? `BR-${String(o.collectionBranchId).padStart(2, '0')}` : undefined,
              pickupBranchName: o.collectionBranchName,
              deliveryAddress: o.deliveryAddress,
              paymentMethod: (o.paymentMethod === 'MANUAL_BANK_TRANSFER' || (o.paymentMethod as string) === 'MANUAL_TRANSFER') ? 'MANUAL_BANK_TRANSFER' : 'IN_HAND_CASH',
              paymentStatus: o.paymentStatus as any,
              status: o.status as any,
              items: (o.items || []).map(it => ({
                productId: `PRD-${it.productId}`,
                productSku: it.productSku,
                productName: it.productName,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                unit: (it.unitSymbol?.toLowerCase() || 'piece') as any,
                lineTotal: (it as any).totalPrice ?? (it as any).lineTotal ?? (it.unitPrice * it.quantity)
              })),
              subtotal: o.subtotal,
              deliveryFee: o.deliveryFee,
              totalAmount: o.totalAmount,
              notes: o.notes,
              reservedStock: true
            }));
            this.orders.set(mappedOrders);
          }
        }
      });
    }

    // 4. Staff with transfer permissions can access inter-branch transfers
    if (this.hasPermission('REQUEST_TRANSFER') || this.hasPermission('APPROVE_TRANSFER') || this.hasPermission('DISPATCH_TRANSFER')) {
      this.transferApi.getTransfers().subscribe({
        next: (res) => {
          if (res.success && res.data?.content?.length) {
            const currentBranches = this.branches();
            const mappedTransfers: StockTransfer[] = res.data.content.map(t => {
              const fromBranch = currentBranches.find(b =>
                b.id === `BR-0${t.sourceWarehouseId}` ||
                b.warehouses?.some(w => w.name === t.sourceWarehouseName || w.id === `WH-0${t.sourceWarehouseId}`)
              );
              const toBranch = currentBranches.find(b =>
                b.id === `BR-0${t.destinationWarehouseId}` ||
                b.warehouses?.some(w => w.name === t.destinationWarehouseName || w.id === `WH-0${t.destinationWarehouseId}`)
              );

              const fromBranchName = t.sourceBranchName || fromBranch?.name || t.sourceWarehouseName || 'Source Branch';
              const toBranchName = t.destinationBranchName || toBranch?.name || t.destinationWarehouseName || 'Destination Branch';

              const fromBranchId = t.sourceBranchId
                ? (t.sourceBranchId < 10 ? `BR-0${t.sourceBranchId}` : `BR-${t.sourceBranchId}`)
                : (fromBranch?.id || `BR-0${t.sourceWarehouseId}`);

              const toBranchId = t.destinationBranchId
                ? (t.destinationBranchId < 10 ? `BR-0${t.destinationBranchId}` : `BR-${t.destinationBranchId}`)
                : (toBranch?.id || `BR-0${t.destinationWarehouseId}`);

              return {
                id: `TR-${t.id}`,
                referenceNumber: t.transferNumber,
                date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent',
                fromBranchId,
                fromBranchName,
                fromWarehouseName: t.sourceWarehouseName || fromBranchName,
                toBranchId,
                toBranchName,
                toWarehouseName: t.destinationWarehouseName || toBranchName,
                status: t.status,
                requestedBy: t.requestedBy || 'Staff',
                approvedBy: t.approvedBy,
                dispatchedBy: t.dispatchedBy,
                receivedBy: t.receivedBy,
                notes: t.notes,
                items: (t.items || []).map(i => ({
                  id: i.id,
                  productId: `PRD-${i.productId}`,
                  productSku: i.productSku || '',
                  productName: i.productName || 'Product',
                  unit: (i.unitSymbol || 'piece') as any,
                  requestedQty: i.requestedQuantity || 0,
                  dispatchedQty: i.dispatchedQuantity,
                  receivedQty: i.receivedQuantity
                })),
                timeline: (t.events || []).map(e => ({
                  id: `EV-${e.id}`,
                  timestamp: e.timestamp ? new Date(e.timestamp).toLocaleString() : 'Recent',
                  actor: e.actor || 'System',
                  role: e.role || 'Staff',
                  action: e.eventType || 'Event',
                  notes: e.notes || ''
                }))
              };
            });
            this.transfers.set(mappedTransfers);
          }
        }
      });
    }

    // 5. Staff with sales/orders permissions can access technical customer inquiries
    if (this.hasPermission('MANAGE_ORDERS')) {
      this.inquiryApi.getAdminInquiries().subscribe({
        next: (res) => {
          if (res.success && res.data?.content?.length) {
            const mappedQuotes: QuotationRequest[] = res.data.content.map(q => ({
              id: `QT-${q.id}`,
              quoteNumber: q.inquiryNumber,
              createdAt: q.createdAt,
              customerName: q.customerName,
              customerPhone: q.phone || '',
              customerEmail: q.email,
              companyName: q.companyName,
              serviceCategory: (q.serviceType || 'PRINTING_PRESS') as any,
              serviceCategoryLabel: q.serviceType || 'Custom Project',
              projectTitle: q.subject,
              specifications: q.specifications || q.message,
              quantity: q.requestedQuantity || 1,
              unit: 'pcs',
              deliveryPreference: 'DELIVERY',
              status: q.status === 'NEW' ? 'PENDING' : q.status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : q.status === 'QUOTED' ? 'QUOTED' : 'ACCEPTED',
              quotedPrice: q.quotedAmount,
              notes: q.message
            }));
            this.quotations.set(mappedQuotes);
          }
        }
      });
    }

    // 6. Low Stock Alerts
    if (this.hasPermission('VIEW_INVENTORY')) {
      this.inventoryApi.getLowStockAlerts().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.lowStockAlerts.set(res.data);
          }
        }
      });
    }

    // 7. Suppliers & Purchase Orders
    if (this.hasPermission('RECEIVE_STOCK') || this.hasPermission('VIEW_INVENTORY')) {
      this.procurementApi.getSuppliers().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.suppliers.set(res.data);
          }
        }
      });

      this.procurementApi.getPurchaseOrders().subscribe({
        next: (res) => {
          if (res.success && res.data?.content) {
            this.purchaseOrders.set(res.data.content);
          }
        }
      });
    }

    // 8. Management Reports (Scoped to user dedicated branch or selected filter)
    this.fetchReports();

    // 9. System Audit Logs
    if (this.hasPermission('SYSTEM_CONFIG') || this.hasPermission('VIEW_REPORTS')) {
      this.auditApi.getAuditLogs().subscribe({
        next: (res) => {
          if (res.success && res.data?.content) {
            this.auditLogs.set(res.data.content);
          }
        }
      });
    }
  }

  fetchReports(branchId?: number): void {
    if (!this.hasPermission('VIEW_REPORTS')) return;

    const effectiveBranchId = branchId !== undefined
      ? branchId
      : (this.isBranchScopeLocked() && this.currentUser()?.assignedBranchId
        ? parseInt(this.currentUser()!.assignedBranchId!.replace('BR-0', '').replace('BR-', ''), 10)
        : undefined);

    this.reportApi.getSalesReport(effectiveBranchId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.salesReport.set(res.data);
        }
      }
    });

    this.reportApi.getStockValuation(effectiveBranchId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.stockValuationReport.set(res.data);
        }
      }
    });

    this.reportApi.getStockSummary(effectiveBranchId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.stockSummaryReport.set(res.data);
        }
      }
    });

    this.reportApi.getTransferReport(effectiveBranchId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.transferReport.set(res.data);
        }
      }
    });
  }

  setBranchFilter(branchId: string): void {
    if (this.isBranchScopeLocked()) {
      const lockedBranch = this.currentUser()?.assignedBranchId || 'BR-01';
      this.selectedBranchFilter.set(lockedBranch);
      return;
    }
    this.selectedBranchFilter.set(branchId);
    if (this.hasPermission('VIEW_REPORTS')) {
      const numId = branchId !== 'ALL'
        ? parseInt(branchId.replace('BR-0', '').replace('BR-', ''), 10)
        : undefined;
      this.fetchReports(numId);
    }
  }

  quoteInquiry(inquiryId: string, amount: number, notes?: string) {
    const numId = parseInt(inquiryId.replace('QT-', '').replace('INQ-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.inquiryApi.quoteInquiry(numId, { quotedAmount: amount, notes }).subscribe({
        next: () => {
          this.toastService.success('Quotation Issued', `Quotation of ETB ${amount.toFixed(2)} sent for ${inquiryId}.`);
          this.syncProtectedData();
        },
        error: (err) => {
          this.toastService.error('Quotation Failed', err?.error?.message || 'Could not issue quotation');
        }
      });
    }
  }

  rejectTransfer(transferId: string, reason: string) {
    const numId = parseInt(transferId.replace('TR-00', '').replace('TR-0', '').replace('TR-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.transferApi.rejectTransfer(numId, reason).subscribe({
        next: () => {
          this.toastService.warning('Transfer Rejected', `Transfer ${transferId} has been rejected.`);
          this.syncProtectedData();
        },
        error: (err) => {
          this.toastService.error('Rejection Failed', err?.error?.detail || err?.error?.message || 'Could not reject transfer');
          this.syncProtectedData();
        }
      });
    } else {
      const current = this.transfers().map(t => t.id === transferId ? { ...t, status: 'REJECTED' as TransferStatus } : t);
      this.transfers.set(current);
      this.toastService.warning('Transfer Rejected', `Transfer ${transferId} has been rejected.`);
    }
  }

  cancelOrder(orderId: string, reason?: string) {
    const numId = parseInt(orderId.replace('ORD-0', '').replace('ORD-', '').replace('AS-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.orderApi.cancelOrder(numId, reason || 'Order cancelled by user').subscribe({
        next: () => {
          this.toastService.warning('Order Cancelled', `Order ${orderId} has been cancelled and stock released.`);
          this.orders.update(orders => orders.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' as OrderStatus } : o));
          this.refreshPublicProducts();
          if (this.isAuthenticated()) {
            this.syncProtectedData();
          }
        },
        error: (err) => {
          this.toastService.error('Cancellation Failed', err?.error?.detail || err?.error?.message || 'Could not cancel order');
          this.syncProtectedData();
        }
      });
    }
  }

  recordStockAdjustment(warehouseId: number, productId: number, delta: number, reason: string, notes?: string) {
    this.inventoryApi.recordAdjustment({
      warehouseId,
      productId,
      quantityDelta: delta,
      reasonCode: reason,
      notes
    }).subscribe({
      next: () => {
        this.toastService.success('Stock Adjusted', `Stock adjusted by ${delta > 0 ? '+' : ''}${delta}.`);
        this.syncProtectedData();
      },
      error: (err) => {
        this.toastService.error('Adjustment Failed', err?.error?.message || 'Could not record adjustment');
      }
    });
  }

  // Cart actions
  addToCart(product: Product, quantity = 1) {
    if (product.pricingType === 'QUOTATION') {
      this.toastService.info('Quotation Required', `${product.name} requires custom pricing. Please request a quotation.`);
      return;
    }
    if (product.availability === 'OUT_OF_STOCK') {
      this.toastService.warning('Out of Stock', `${product.name} is currently out of stock and cannot be added to cart.`);
      return;
    }
    const current = [...this.cart()];
    const index = current.findIndex(ci => ci.product.id === product.id);
    if (index > -1) {
      const existing = current[index];
      const newQty = existing.quantity + quantity;
      current[index] = {
        product,
        quantity: newQty,
        lineTotal: newQty * product.unitPrice
      };
    } else {
      current.push({
        product,
        quantity,
        lineTotal: quantity * product.unitPrice
      });
    }
    this.cart.set(current);
  }

  updateCartQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const current = this.cart().map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          lineTotal: quantity * item.product.unitPrice
        };
      }
      return item;
    });
    this.cart.set(current);
  }

  removeFromCart(productId: string) {
    this.cart.set(this.cart().filter(i => i.product.id !== productId));
  }

  clearCart() {
    this.cart.set([]);
  }

  // Create Order from Cart (Fully Synchronized with Central Database)
  placeOrder(
    orderData: {
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      companyName?: string;
      fulfillment: FulfillmentType;
      pickupBranchId?: string;
      deliveryAddress?: string;
      paymentMethod: PaymentMethod;
      notes?: string;
    },
    callbacks?: {
      onSuccess?: (order: Order) => void;
      onError?: (errorMsg: string) => void;
    }
  ): void {
    const backendItems = this.cart().map(ci => ({
      productId: parseInt(ci.product.id.replace('PRD-0', '').replace('PRD-', ''), 10) || 1,
      quantity: ci.quantity
    }));

    const collectionBranchNum = orderData.pickupBranchId
      ? (parseInt(orderData.pickupBranchId.replace('BR-0', '').replace('BR-', ''), 10) || undefined)
      : undefined;

    const backendPayload: BackendCreateOrderRequest = {
      customerName: orderData.customerName.trim(),
      customerEmail: orderData.customerEmail.trim(),
      customerPhone: orderData.customerPhone.trim(),
      deliveryType: orderData.fulfillment === 'BRANCH_PICKUP' ? 'STORE_PICKUP' : 'STANDARD_DELIVERY',
      collectionBranchId: collectionBranchNum,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod === 'MANUAL_BANK_TRANSFER' ? 'MANUAL_BANK_TRANSFER' : 'CASH_ON_DELIVERY',
      notes: orderData.notes,
      items: backendItems
    };

    this.orderApi.createOrder(backendPayload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const backendOrder = res.data;
          const pickupBranchName = this.branches().find(b => b.id === orderData.pickupBranchId)?.name;

          const confirmedOrder: Order = {
            id: `ORD-${backendOrder.id}`,
            orderNumber: backendOrder.orderNumber,
            createdAt: backendOrder.createdAt ? new Date(backendOrder.createdAt).toLocaleDateString() : 'Just now',
            customerName: backendOrder.customerName,
            customerPhone: backendOrder.customerPhone || orderData.customerPhone,
            customerEmail: backendOrder.customerEmail,
            companyName: orderData.companyName,
            fulfillment: orderData.fulfillment,
            pickupBranchId: orderData.pickupBranchId,
            pickupBranchName,
            deliveryAddress: backendOrder.deliveryAddress || orderData.deliveryAddress,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: (backendOrder.paymentStatus as any) || 'PENDING',
            status: (backendOrder.status as any) || 'PENDING_PAYMENT',
            items: (backendOrder.items || []).map(it => ({
              productId: `PRD-${it.productId}`,
              productSku: it.productSku,
              productName: it.productName,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              unit: (it.unitSymbol?.toLowerCase() || 'piece') as any,
              lineTotal: (it as any).totalPrice ?? (it as any).lineTotal ?? (it.unitPrice * it.quantity)
            })),
            subtotal: backendOrder.subtotal,
            deliveryFee: backendOrder.deliveryFee,
            totalAmount: backendOrder.totalAmount,
            notes: backendOrder.notes || orderData.notes,
            reservedStock: true
          };

          this.orders.update(orders => [confirmedOrder, ...orders.filter(o => o.id !== confirmedOrder.id)]);
          this.clearCart();
          this.toastService.success('Order Placed Successfully', `Order ${backendOrder.orderNumber} confirmed. Stock reserved.`);

          this.refreshPublicProducts();
          if (this.isAuthenticated()) {
            this.syncProtectedData();
          }

          if (callbacks?.onSuccess) {
            callbacks.onSuccess(confirmedOrder);
          }
        } else {
          const errMsg = res.message || 'Failed to place order';
          this.toastService.error('Order Placement Failed', errMsg);
          if (callbacks?.onError) {
            callbacks.onError(errMsg);
          }
        }
      },
      error: (err) => {
        const errMsg = err?.error?.detail || err?.error?.message || 'Failed to place order. Please verify item quantities and stock availability.';
        this.toastService.error('Order Placement Failed', errMsg);
        if (callbacks?.onError) {
          callbacks.onError(errMsg);
        }
      }
    });
  }

  // Submit Customer Quotation Request
  submitQuotation(quoteData: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    companyName?: string;
    serviceCategory: any;
    projectTitle: string;
    specifications: string;
    quantity: number;
    unit: string;
    targetTimeline?: string;
    deliveryPreference: 'PICKUP' | 'DELIVERY';
    branchPreference?: string;
    notes?: string;
  }): QuotationRequest {
    const quoteNumber = `QT-2026-${String(843 + this.quotations().length).padStart(5, '0')}`;
    const categoryLabels: Record<string, string> = {
      'PRINTING_PRESS': 'Printing Press Services',
      'BRANDING_PROMOTION': 'Branding & Promotion',
      'GARMENT_MATERIALS': 'Garment Materials',
      'PRINTING_SUPPLIES': 'Printing Supplies',
      'EQUIPMENT_DISTRIBUTION': 'Equipment Distribution'
    };

    const newQuote: QuotationRequest = {
      id: `QT-${Date.now()}`,
      quoteNumber,
      createdAt: 'Just now',
      customerName: quoteData.customerName,
      customerPhone: quoteData.customerPhone,
      customerEmail: quoteData.customerEmail,
      companyName: quoteData.companyName,
      serviceCategory: quoteData.serviceCategory,
      serviceCategoryLabel: categoryLabels[quoteData.serviceCategory] || 'Custom Project',
      projectTitle: quoteData.projectTitle,
      specifications: quoteData.specifications,
      quantity: quoteData.quantity,
      unit: quoteData.unit,
      targetTimeline: quoteData.targetTimeline,
      deliveryPreference: quoteData.deliveryPreference,
      branchPreference: quoteData.branchPreference,
      status: 'PENDING',
      notes: quoteData.notes
    };

    this.quotations.set([newQuote, ...this.quotations()]);
    this.toastService.info('Quotation Request Logged', `Reference ${quoteNumber} submitted for technical review.`);

    // Backend Cloud Dispatch
    this.inquiryApi.submitInquiry({
      customerName: quoteData.customerName,
      email: quoteData.customerEmail,
      phone: quoteData.customerPhone,
      companyName: quoteData.companyName,
      serviceType: quoteData.serviceCategory,
      inquiryType: 'PRICE_QUOTATION',
      subject: quoteData.projectTitle,
      message: quoteData.notes || quoteData.specifications,
      specifications: quoteData.specifications,
      requestedQuantity: quoteData.quantity
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const backendInquiry = res.data;
          this.quotations.update(quotes => quotes.map(q => q.id === newQuote.id ? {
            ...q,
            id: `QT-${backendInquiry.id}`,
            quoteNumber: backendInquiry.inquiryNumber
          } : q));
          this.toastService.success('Quotation Synced', `Technical inquiry ${backendInquiry.inquiryNumber} registered in central queue.`);
        }
      },
      error: () => {
        // Inquiry recorded in local system
      }
    });

    return newQuote;
  }

  // Weighted-Average Costing & Stock Receipt
  receiveStock(cmd: StockReceiptCommand) {
    const numProductId = parseInt(cmd.productId.replace('PRD-0', '').replace('PRD-', ''), 10) || 1;
    const numWarehouseId = parseInt(cmd.warehouseId.replace('WH-0', '').replace('WH-', ''), 10) || 1;

    this.inventoryApi.recordReceipt({
      warehouseId: numWarehouseId,
      productId: numProductId,
      quantity: cmd.quantity,
      unitCost: cmd.unitCost,
      referenceType: 'PURCHASE_ORDER',
      referenceId: cmd.referenceNumber,
      notes: `Supplier: ${cmd.supplierName}. ${cmd.notes || ''}`
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Stock Receipt Posted', `Received ${cmd.quantity} units into warehouse.`);
          this.syncProtectedData();
          this.refreshPublicProducts();
        } else {
          this.toastService.error('Stock Receipt Failed', res.message || 'Could not record stock receipt');
        }
      },
      error: (err) => {
        this.toastService.error('Stock Receipt Failed', err?.error?.detail || err?.error?.message || 'Could not post stock receipt');
        this.syncProtectedData();
      }
    });
  }

  // Inter-Branch Transfer Workflow
  createTransfer(transferData: {
    fromBranchId: string;
    toBranchId: string;
    items: { productId: string; requestedQty: number }[];
    notes?: string;
  }): void {
    const fromBranchNum = parseInt(transferData.fromBranchId.replace('BR-0', '').replace('BR-', ''), 10) || 1;
    const toBranchNum = parseInt(transferData.toBranchId.replace('BR-0', '').replace('BR-', ''), 10) || 2;

    const fromBranch = this.branches().find(b => b.id === transferData.fromBranchId);
    const toBranch = this.branches().find(b => b.id === transferData.toBranchId);

    const fromWhId = fromBranch?.warehouses[0]?.id
      ? (parseInt(fromBranch.warehouses[0].id.replace('WH-0', '').replace('WH-', ''), 10) || fromBranchNum)
      : fromBranchNum;
    const toWhId = toBranch?.warehouses[0]?.id
      ? (parseInt(toBranch.warehouses[0].id.replace('WH-0', '').replace('WH-', ''), 10) || toBranchNum)
      : toBranchNum;

    this.transferApi.createTransfer({
      sourceWarehouseId: fromWhId,
      destinationWarehouseId: toWhId,
      notes: transferData.notes,
      items: transferData.items.map(it => ({
        productId: parseInt(it.productId.replace('PRD-0', '').replace('PRD-', ''), 10) || 1,
        quantity: it.requestedQty,
        requestedQuantity: it.requestedQty
      }))
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const backendTransfer = res.data;
          this.transferApi.submitTransfer(backendTransfer.id).subscribe({
            next: () => {
              this.toastService.success('Transfer Requisition Created', `Transfer ${backendTransfer.transferNumber} submitted for authorization.`);
              this.syncProtectedData();
            },
            error: () => {
              this.toastService.success('Transfer Created', `Transfer ${backendTransfer.transferNumber} registered.`);
              this.syncProtectedData();
            }
          });
        }
      },
      error: (err) => {
        this.toastService.error('Transfer Creation Failed', err?.error?.detail || err?.error?.message || 'Could not create transfer request');
        this.syncProtectedData();
      }
    });
  }

  approveTransfer(transferId: string, actor: string) {
    const numId = parseInt(transferId.replace('TR-00', '').replace('TR-0', '').replace('TR-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.transferApi.approveTransfer(numId).subscribe({
        next: () => {
          this.toastService.success('Transfer Approved', `Transfer ${transferId} approved for dispatch.`);
          this.syncProtectedData();
        },
        error: (err) => {
          this.toastService.error('Approval Failed', err?.error?.detail || err?.error?.message || 'Could not approve transfer in backend');
          this.syncProtectedData();
        }
      });
    }
  }

  dispatchTransfer(transferId: string, actor: string) {
    const numId = parseInt(transferId.replace('TR-00', '').replace('TR-0', '').replace('TR-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.transferApi.dispatchTransfer(numId).subscribe({
        next: () => {
          this.toastService.warning('Stock Dispatched', `Transfer ${transferId} is now In-Transit.`);
          this.syncProtectedData();
          this.refreshPublicProducts();
        },
        error: (err) => {
          this.toastService.error('Dispatch Failed', err?.error?.detail || err?.error?.message || 'Could not dispatch transfer in backend');
          this.syncProtectedData();
        }
      });
    }
  }

  receiveTransfer(transferId: string, actor: string, itemReceipts?: Record<string, number>) {
    const transfer = this.transfers().find(t => t.id === transferId);
    if (!transfer) return;

    const numId = parseInt(transferId.replace('TR-00', '').replace('TR-0', '').replace('TR-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      const itemsPayload = transfer.items.map((item, idx) => ({
        transferItemId: item.id || (idx + 1),
        receivedQuantity: itemReceipts?.[item.productId] ?? item.dispatchedQty ?? item.requestedQty
      }));
      this.transferApi.receiveTransfer(numId, { items: itemsPayload, notes: 'Goods received and inspected.' }).subscribe({
        next: () => {
          this.toastService.success('Transfer Completed', `Transfer ${transferId} received at destination warehouse.`);
          this.syncProtectedData();
          this.refreshPublicProducts();
        },
        error: (err) => {
          this.toastService.error('Receipt Failed', err?.error?.detail || err?.error?.message || 'Could not record transfer receipt in backend');
          this.syncProtectedData();
        }
      });
    }
  }

  // Update Order Status
  updateOrderStatus(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
    if (status === 'CANCELLED') {
      this.cancelOrder(orderId, 'Order cancelled by staff action');
      return;
    }

    const numId = parseInt(orderId.replace('ORD-0', '').replace('ORD-', '').replace('AS-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.orderApi.updateOrderStatus(numId, status).subscribe({
        next: () => {
          if (paymentStatus === 'PAID') {
            this.orderApi.confirmOrder(numId).subscribe({
              next: () => {
                this.syncProtectedData();
                this.refreshPublicProducts();
              }
            });
          } else {
            this.syncProtectedData();
            this.refreshPublicProducts();
          }
          this.toastService.success('Order Status Updated', `Order ${orderId} marked as ${status}.`);
        },
        error: (err) => {
          this.toastService.error('Update Failed', err?.error?.detail || err?.error?.message || 'Could not update order status');
          this.syncProtectedData();
        }
      });
    }
  }

  // Create Product in Catalog (Fully Synced with Cloud Database)
  addProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      ...product,
      id: `PRD-${Date.now()}`
    };
    this.products.set([newProduct, ...this.products()]);

    let categoryId = 1;
    if (product.category === 'GARMENT_MATERIALS') categoryId = 2;
    else if (product.category === 'BRANDING_PROMOTION') categoryId = 3;
    else if (product.category === 'PRINTING_SERVICES') categoryId = 4;
    else if (product.category === 'EQUIPMENT') categoryId = 5;

    const cleanImages = (product.images || []).filter(img => !img.startsWith('data:'));
    const primaryImage = product.imageUrl && !product.imageUrl.startsWith('data:')
      ? product.imageUrl
      : (cleanImages[0] || undefined);

    const specPayload = {
      ...(typeof product.specifications === 'object' ? product.specifications : { 'Specifications': String(product.specifications || '') }),
      _galleryImages: cleanImages
    };

    this.catalogApi.createProduct({
      sku: product.sku,
      name: product.name,
      amharicName: product.amharicName,
      description: product.description,
      categoryId,
      baseUnitId: 1,
      purchaseCost: product.baseCost,
      sellingPrice: product.unitPrice,
      reorderThreshold: product.reorderThreshold,
      isQuotationOnly: product.pricingType === 'QUOTATION',
      isPublished: product.isPublished,
      imageUrl: primaryImage,
      specifications: JSON.stringify(specPayload)
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const bp = res.data;
          this.products.update(prods => prods.map(p => p.id === newProduct.id ? {
            ...p,
            id: `PRD-${bp.id}`,
            sku: bp.sku
          } : p));
          this.toastService.success('Catalog Updated', `${product.name} synchronized with central inventory.`);
          this.refreshPublicProducts();
        }
      },
      error: (err) => {
        this.toastService.error('Product Creation Failed', err?.error?.message || 'Could not save product');
        this.refreshPublicProducts();
      }
    });

    return newProduct;
  }

  // === DYNAMIC PRODUCT UPDATES ===
  updateProduct(id: string, updates: Partial<Product>) {
    this.products.update(prods => prods.map(p => p.id === id ? { ...p, ...updates } : p));
    this.toastService.success('Product Updated', 'Catalog entry modified successfully.');

    const numId = parseInt(id.replace('PRD-0', '').replace('PRD-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      const cleanImages = updates.images ? updates.images.filter(img => !img.startsWith('data:')) : undefined;
      const primaryImage = updates.imageUrl && !updates.imageUrl.startsWith('data:')
        ? updates.imageUrl
        : (cleanImages && cleanImages.length > 0 ? cleanImages[0] : undefined);

      let specPayloadString: string | undefined;
      if (cleanImages && cleanImages.length > 0) {
        specPayloadString = JSON.stringify({
          ...(typeof updates.specifications === 'object' ? updates.specifications : {}),
          _galleryImages: cleanImages
        });
      }

      this.catalogApi.updateProduct(numId, {
        name: updates.name,
        sellingPrice: updates.unitPrice,
        purchaseCost: updates.baseCost,
        reorderThreshold: updates.reorderThreshold,
        isPublished: updates.isPublished,
        description: updates.description,
        imageUrl: primaryImage,
        specifications: specPayloadString
      }).subscribe({
        next: () => {
          this.refreshPublicProducts();
        },
        error: (err) => {
          console.warn('[AserState] Product update error in backend:', err);
          this.refreshPublicProducts();
        }
      });
    }
  }

  deleteProduct(id: string) {
    const p = this.products().find(prod => prod.id === id);
    this.products.update(prods => prods.filter(prod => prod.id !== id));
    this.toastService.info('Product Archived', `${p?.name} removed from active catalog.`);

    const numId = parseInt(id.replace('PRD-0', '').replace('PRD-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.catalogApi.archiveProduct(numId).subscribe({
        error: () => console.warn('[AserState] Product archived locally')
      });
    }
  }

  // === DYNAMIC BRANCH MANAGEMENT ===
  createBranch(data: {
    name: string;
    code: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    isHeadOffice?: boolean;
  }) {
    this.branchApi.createBranch({
      name: data.name,
      code: data.code.toUpperCase(),
      address: data.address || '',
      city: data.city || 'Addis Ababa',
      phone: data.phone || '+251 11 000 0000',
      email: data.email || 'branch@asertrading.et',
      isActive: true
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Branch Added', `${data.name} (${data.code.toUpperCase()}) created successfully.`);
          this.fetchBranches();
        }
      },
      error: (err) => {
        this.toastService.error('Branch Creation Failed', err?.error?.message || 'Could not create branch');
        this.fetchBranches();
      }
    });
  }

  updateBranch(id: string, updates: Partial<Branch>) {
    const numId = parseInt(id.replace('BR-0', '').replace('BR-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.branchApi.updateBranch(numId, {
        name: updates.name || '',
        code: updates.code || '',
        address: updates.address,
        city: updates.city,
        phone: updates.phone,
        email: updates.email,
        isActive: true
      }).subscribe({
        next: () => {
          this.toastService.success('Branch Updated', 'Branch details saved.');
          this.fetchBranches();
        },
        error: (err) => {
          this.toastService.error('Branch Update Failed', err?.error?.message || 'Could not update branch');
          this.fetchBranches();
        }
      });
    }
  }

  deleteBranch(id: string) {
    const branch = this.branches().find(b => b.id === id);
    if (branch?.isHeadOffice) {
      this.toastService.warning('Action Blocked', 'Cannot delete Head Office branch.');
      return;
    }
    this.branches.update(bList => bList.filter(b => b.id !== id));
    this.toastService.info('Branch Removed', `${branch?.name} removed from active network.`);
  }

  addWarehouse(branchId: string, name: string, code: string) {
    const numBranchId = parseInt(branchId.replace('BR-0', '').replace('BR-', ''), 10) || 1;
    this.branchApi.createWarehouse({
      branchId: numBranchId,
      name,
      code: code.toUpperCase(),
      isDefault: false
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Warehouse Created', `Added warehouse ${name} (${code}).`);
          this.fetchBranches();
        }
      },
      error: (err) => {
        this.toastService.error('Warehouse Creation Failed', err?.error?.message || 'Could not add warehouse');
        this.fetchBranches();
      }
    });
  }

  // === DYNAMIC COMMERCIAL SERVICES MANAGEMENT ===
  createService(data: Omit<AserServiceItem, 'id' | 'isActive'>) {
    this.catalogApi.createAdminService({
      serviceCode: data.code,
      title: data.title,
      category: data.category,
      description: data.description,
      imageUrl: data.imageUrl,
      keyOfferings: data.features?.join(';') || '',
      requiresQuotation: data.requiresQuotation
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Service Created', `${data.title} added to company services.`);
          this.fetchServices();
        }
      },
      error: (err) => {
        this.toastService.error('Service Creation Failed', err?.error?.message || 'Could not create service');
        this.fetchServices();
      }
    });
  }

  updateService(id: string, updates: Partial<AserServiceItem>) {
    const numId = parseInt(id.replace('SVC-0', '').replace('SVC-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.catalogApi.updateAdminService(numId, {
        title: updates.title,
        category: updates.category,
        description: updates.description,
        imageUrl: updates.imageUrl,
        keyOfferings: updates.features?.join(';') || '',
        requiresQuotation: updates.requiresQuotation
      }).subscribe({
        next: () => {
          this.toastService.success('Service Updated', 'Service details modified.');
          this.fetchServices();
        },
        error: (err) => {
          this.toastService.error('Service Update Failed', err?.error?.message || 'Could not update service');
          this.fetchServices();
        }
      });
    }
  }

  toggleServiceActive(id: string) {
    const svc = this.services().find(s => s.id === id);
    if (!svc) return;
    const newActive = !svc.isActive;
    this.updateService(id, { isActive: newActive });
    this.toastService.info('Service Status', `${svc.title} is now ${newActive ? 'Active' : 'Hidden from website'}.`);
  }

  deleteService(id: string) {
    const numId = parseInt(id.replace('SVC-0', '').replace('SVC-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.catalogApi.deleteAdminService(numId).subscribe({
        next: () => {
          this.toastService.info('Service Deleted', 'Removed from catalog.');
          this.fetchServices();
        },
        error: (err) => {
          this.toastService.error('Delete Failed', err?.error?.message || 'Could not delete service');
          this.fetchServices();
        }
      });
    }
  }

  // === DYNAMIC EMPLOYEE MANAGEMENT & REGISTRATION ===
  registerEmployee(data: {
    username: string;
    email: string;
    fullName: string;
    phone?: string;
    role: StaffRole;
    assignedBranchId?: string;
    password: string;
  }) {
    const numBranchId = data.assignedBranchId ? parseInt(data.assignedBranchId.replace('BR-0', '').replace('BR-', ''), 10) : undefined;
    this.userApi.createUser({
      username: data.username.trim().toLowerCase(),
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      phone: data.phone,
      role: data.role,
      assignedBranchId: numBranchId,
      password: data.password
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Employee Registered', `${data.fullName} successfully created in central directory.`);
          this.syncProtectedData();
        }
      },
      error: (err) => {
        this.toastService.error('Registration Failed', err?.error?.message || 'Could not create employee');
        this.syncProtectedData();
      }
    });
  }

  updateEmployee(id: string, updates: Partial<EmployeeUser>) {
    const numId = parseInt(id.replace('USR-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      const numBranchId = updates.assignedBranchId ? parseInt(updates.assignedBranchId.replace('BR-0', '').replace('BR-', ''), 10) : undefined;
      this.userApi.updateUser(numId, {
        fullName: updates.fullName || '',
        email: updates.email || '',
        phone: updates.phone,
        role: updates.role,
        assignedBranchId: numBranchId,
        isActive: updates.isActive
      }).subscribe({
        next: () => {
          this.toastService.success('Employee Updated', 'Staff profile updated successfully.');
          this.syncProtectedData();
        },
        error: (err) => {
          this.toastService.error('Update Failed', err?.error?.message || 'Could not update employee');
          this.syncProtectedData();
        }
      });
    }
  }

  toggleEmployeeStatus(id: string) {
    const emp = this.employees().find(e => e.id === id);
    if (!emp) return;
    const newStatus = !emp.isActive;
    this.updateEmployee(id, { isActive: newStatus });
    this.toastService.info('Status Changed', `${emp.fullName} is now ${newStatus ? 'Active' : 'Suspended'}.`);
  }
}
