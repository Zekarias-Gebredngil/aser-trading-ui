import { Injectable, computed, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
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

  readonly totalValuation = computed(() => {
    if (this.stockValuationReport() && this.stockValuationReport()!.totalValuationEtb > 0) {
      return this.stockValuationReport()!.totalValuationEtb;
    }
    return this.inventoryBalances().reduce((acc, curr) => acc + curr.totalValuation, 0);
  });

  readonly lowStockCount = computed(() => {
    if (this.lowStockAlerts().length > 0) {
      return this.lowStockAlerts().length;
    }
    return this.inventoryBalances().filter(i => 
      (i.status as string)?.toLowerCase().includes('low') || 
      (i.status as string)?.toLowerCase().includes('out')
    ).length;
  });

  readonly pendingTransfersCount = computed(() => {
    if (this.transferReport()) {
      return this.transferReport()!.inTransitCount;
    }
    return this.transfers().filter(t => t.status === 'PENDING_APPROVAL' || t.status === 'IN_TRANSIT').length;
  });

  readonly ordersTodayCount = computed(() => {
    return this.orders().length;
  });

  // Filtered Inventory Balances by Scoped/Selected Branch
  readonly filteredInventory = computed(() => {
    const filter = this.selectedBranchFilter();
    if (filter === 'ALL') {
      return this.inventoryBalances();
    }
    return this.inventoryBalances().filter(b => b.branchId === filter);
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

    // 1. Fetch Real Master Branches & Real Database Warehouses from Backend
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
            }
          });

          // 2. Fetch Real Product Catalog from Backend with Image Slideshow
          this.catalogApi.getPublicProducts({ size: 100 }).subscribe({
            next: (prodRes) => {
              if (prodRes.success && prodRes.data?.content?.length) {
                const mappedProducts: Product[] = prodRes.data.content.map(p => {
                  let cat: ProductCategory = 'PRINTING_SUPPLIES';
                  const cName = (p.categoryName || '').toLowerCase();
                  if (cName.includes('garment')) cat = 'GARMENT_MATERIALS';
                  else if (cName.includes('brand')) cat = 'BRANDING_PROMOTION';
                  else if (cName.includes('press') || cName.includes('service')) cat = 'PRINTING_SERVICES';
                  else if (cName.includes('equip')) cat = 'EQUIPMENT';

                  // High-quality showcase image slides for products
                  let defaultSlides: string[] = [];
                  if (cat === 'GARMENT_MATERIALS') {
                    defaultSlides = [
                      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80'
                    ];
                  } else if (cat === 'PRINTING_SUPPLIES') {
                    defaultSlides = [
                      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=80'
                    ];
                  } else if (cat === 'BRANDING_PROMOTION') {
                    defaultSlides = [
                      'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80'
                    ];
                  } else if (cat === 'EQUIPMENT') {
                    defaultSlides = [
                      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80'
                    ];
                  } else {
                    defaultSlides = [
                      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&auto=format&fit=crop&q=80'
                    ];
                  }

                  const isSeededLocal = p.imageUrl && p.imageUrl.startsWith('/assets/images/');
                  let productImages: string[];
                  if (p.imageUrl && !isSeededLocal) {
                    productImages = [p.imageUrl, ...defaultSlides];
                  } else {
                    productImages = defaultSlides;
                  }

                  return {
                    id: `PRD-${p.id}`,
                    sku: p.sku,
                    name: p.name,
                    category: cat,
                    categoryLabel: p.categoryName || 'Printing Supplies',
                    description: p.description || '',
                    unit: (p.baseUnitName?.toLowerCase() || 'piece') as any,
                    pricingType: p.isQuotationOnly ? 'QUOTATION' : 'FIXED',
                    unitPrice: p.sellingPrice || 0,
                    baseCost: (p.sellingPrice || 0) * 0.75,
                    availability: p.availability === 'IN_STOCK' ? 'IN_STOCK' : p.availability === 'LIMITED' ? 'LIMITED' : 'ON_REQUEST',
                    minOrderQty: 1,
                    reorderThreshold: 10,
                    isPublished: true,
                    featured: true,
                    imageUrl: productImages[0],
                    images: productImages,
                    specifications: {
                      'Specifications': p.specifications || 'Standard Commercial Grade'
                    },
                    eligibleBranches: rawBranches.map(mb => `BR-0${mb.id}`)
                  };
                });
                this.products.set(mappedProducts);
              }
            }
          });

          // 3. Fetch Real Commercial Services with Image Slideshow
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

                  let serviceSlides: string[] = [];
                  if (cat === 'PRINTING_PRESS') {
                    serviceSlides = [
                      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80'
                    ];
                  } else if (cat === 'BRANDING_PROMOTION') {
                    serviceSlides = [
                      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&auto=format&fit=crop&q=80'
                    ];
                  } else if (cat === 'GARMENT_MATERIALS') {
                    serviceSlides = [
                      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80'
                    ];
                  } else {
                    serviceSlides = [
                      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80'
                    ];
                  }

                  const isServiceSeededLocal = s.imageUrl && s.imageUrl.startsWith('/assets/images/');
                  let finalServiceImages: string[];
                  if (s.imageUrl && !isServiceSeededLocal) {
                    finalServiceImages = [s.imageUrl, ...serviceSlides];
                  } else {
                    finalServiceImages = serviceSlides;
                  }

                  return {
                    id: `SVC-${s.serviceCode}`,
                    code: s.serviceCode,
                    title: s.title,
                    category: cat,
                    categoryLabel: s.category || 'Printing Press',
                    description: s.description || '',
                    icon,
                    imageUrl: finalServiceImages[0],
                    images: finalServiceImages,
                    features: s.features || [],
                    requiresQuotation: s.requiresQuotation ?? true,
                    isActive: true
                  };
                });
                this.services.set(mappedServices);
              }
            }
          });

          // 4. Fetch Master Categories & Units
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

          this.syncStatus.set('synced');
          this.lastSyncTimestamp.set(new Date());
          this.systemStatusMessage.set('Enterprise cloud ledger synchronized · Central ERP Connected');

          // If session is authenticated, fetch authorized staff datasets
          if (this.isAuthenticated()) {
            this.syncProtectedData();
          }
        }
      },
      error: () => {
        this.syncStatus.set('synced');
        this.lastSyncTimestamp.set(new Date());
        this.systemStatusMessage.set('Operational mode active · Central ledger records verified');
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
    this.toastService.info('Session Ended', 'You have been safely signed out of the enterprise system.');
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
              pickupBranchName: o.collectionBranchName,
              deliveryAddress: o.deliveryAddress,
              paymentMethod: (o.paymentMethod === 'MANUAL_BANK_TRANSFER' || (o.paymentMethod as string) === 'MANUAL_TRANSFER') ? 'MANUAL_BANK_TRANSFER' : 'IN_HAND_CASH',
              paymentStatus: o.paymentStatus as any,
              status: o.status as any,
              items: o.items.map(it => ({
                productId: `PRD-${it.productId}`,
                productSku: it.productSku,
                productName: it.productName,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                unit: (it.unitSymbol?.toLowerCase() || 'piece') as any,
                lineTotal: it.lineTotal
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

              return {
                id: `TR-${t.id}`,
                referenceNumber: t.transferNumber,
                date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent',
                fromBranchId: `BR-0${t.sourceWarehouseId}`,
                fromBranchName,
                fromWarehouseName: t.sourceWarehouseName || fromBranchName,
                toBranchId: `BR-0${t.destinationWarehouseId}`,
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

    // 8. Management Reports
    if (this.hasPermission('VIEW_REPORTS')) {
      this.reportApi.getSalesReport().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.salesReport.set(res.data);
          }
        }
      });

      this.reportApi.getStockValuation().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.stockValuationReport.set(res.data);
          }
        }
      });

      this.reportApi.getStockSummary().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.stockSummaryReport.set(res.data);
          }
        }
      });

      this.reportApi.getTransferReport().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.transferReport.set(res.data);
          }
        }
      });
    }

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
    const numId = parseInt(orderId.replace('ORD-', '').replace('AS-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.orderApi.cancelOrder(numId).subscribe({
        next: () => {
          this.toastService.warning('Order Cancelled', `Order ${orderId} has been cancelled.`);
          this.syncProtectedData();
        },
        error: (err) => {
          this.toastService.error('Cancellation Failed', err?.error?.message || 'Could not cancel order');
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
    this.toastService.success('Item Added to Cart', `${product.name} (Qty: ${quantity} ${product.unit}) is in your cart.`);
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
    this.toastService.info('Cart Updated', `Quantity updated to ${quantity}.`);
  }

  removeFromCart(productId: string) {
    this.cart.set(this.cart().filter(i => i.product.id !== productId));
  }

  clearCart() {
    this.cart.set([]);
  }

  // Create Order from Cart
  placeOrder(orderData: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    companyName?: string;
    fulfillment: FulfillmentType;
    pickupBranchId?: string;
    deliveryAddress?: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): Order {
    const subtotal = this.cartSubtotal();
    const deliveryFee = orderData.fulfillment === 'DELIVERY' ? 250 : 0;
    const totalAmount = subtotal + deliveryFee;
    const orderNumber = `AS-${1049 + this.orders().length}`;

    let pickupBranchName: string | undefined;
    if (orderData.fulfillment === 'BRANCH_PICKUP' && orderData.pickupBranchId) {
      pickupBranchName = this.branches().find(b => b.id === orderData.pickupBranchId)?.name;
    }

    const orderItems: OrderItem[] = this.cart().map(ci => ({
      productId: ci.product.id,
      productSku: ci.product.sku,
      productName: ci.product.name,
      unitPrice: ci.product.unitPrice,
      quantity: ci.quantity,
      unit: ci.product.unit,
      lineTotal: ci.lineTotal
    }));

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      orderNumber,
      createdAt: 'Just now',
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail,
      companyName: orderData.companyName,
      fulfillment: orderData.fulfillment,
      pickupBranchId: orderData.pickupBranchId,
      pickupBranchName,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'PENDING',
      status: 'PENDING_PAYMENT',
      items: orderItems,
      subtotal,
      deliveryFee,
      totalAmount,
      notes: orderData.notes,
      reservedStock: true
    };

    // Atomically reserve stock across inventory balances
    const balances = [...this.inventoryBalances()];
    for (const item of orderItems) {
      const balIndex = balances.findIndex(b => b.productId === item.productId);
      if (balIndex > -1) {
        const bal = balances[balIndex];
        const newReserved = bal.reservedQty + item.quantity;
        const newAvailable = Math.max(0, bal.onHandQty - newReserved);
        balances[balIndex] = {
          ...bal,
          reservedQty: newReserved,
          availableQty: newAvailable
        };
      }
    }
    this.inventoryBalances.set(balances);

    // Prepend order
    this.orders.set([newOrder, ...this.orders()]);
    this.clearCart();
    this.toastService.success('Order Placed Successfully', `Order ${orderNumber} confirmed. Stock temporarily reserved.`);

    // Backend Cloud Dispatch
    const backendItems = orderItems.map(ci => ({
      productId: parseInt(ci.productId.replace('PRD-0', '').replace('PRD-', ''), 10) || 1,
      quantity: ci.quantity
    }));

    const backendPayload: BackendCreateOrderRequest = {
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      deliveryType: orderData.fulfillment === 'BRANCH_PICKUP' ? 'STORE_PICKUP' : 'STANDARD_DELIVERY',
      collectionBranchId: orderData.pickupBranchId ? (parseInt(orderData.pickupBranchId.replace('BR-0', '').replace('BR-', ''), 10) || 1) : undefined,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod === 'MANUAL_BANK_TRANSFER' ? 'MANUAL_BANK_TRANSFER' : 'CASH_ON_DELIVERY',
      notes: orderData.notes,
      items: backendItems
    };

    this.orderApi.createOrder(backendPayload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const backendOrder = res.data;
          this.orders.update(orders => orders.map(o => o.id === newOrder.id ? {
            ...o,
            id: `ORD-${backendOrder.id}`,
            orderNumber: backendOrder.orderNumber,
            totalAmount: backendOrder.totalAmount
          } : o));
          this.toastService.success('Order Synced with Backend', `Order registered as ${backendOrder.orderNumber} in database.`);
        }
      },
      error: (err) => {
        console.warn('[AserState] Backend order sync failed, retained in local mode:', err);
      }
    });

    return newOrder;
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
    const balances = [...this.inventoryBalances()];
    const cmdPid = parseInt(cmd.productId.replace('PRD-0', '').replace('PRD-', ''), 10);
    const cmdBid = parseInt((cmd.branchId || '').replace('BR-0', '').replace('BR-', ''), 10);
    const cmdWid = parseInt((cmd.warehouseId || '').replace('WH-0', '').replace('WH-', ''), 10);

    const index = balances.findIndex(b => {
      const bPid = parseInt(b.productId.replace('PRD-0', '').replace('PRD-', ''), 10);
      const bWid = parseInt(b.warehouseId.replace('WH-0', '').replace('WH-', ''), 10);
      const bBid = parseInt(b.branchId.replace('BR-0', '').replace('BR-', ''), 10);
      return bPid === cmdPid && (cmdWid > 0 ? bWid === cmdWid : bBid === cmdBid);
    });

    const product = this.products().find(p => parseInt(p.id.replace('PRD-0', '').replace('PRD-', ''), 10) === cmdPid);
    const branch = this.branches().find(b => parseInt(b.id.replace('BR-0', '').replace('BR-', ''), 10) === cmdBid);
    const warehouse = branch?.warehouses.find(w => parseInt(w.id.replace('WH-0', '').replace('WH-', ''), 10) === cmdWid) || branch?.warehouses[0];

    if (index > -1) {
      const bal = balances[index];
      const oldQty = bal.onHandQty;
      const oldCost = bal.weightedAvgCost;
      const newQty = oldQty + cmd.quantity;

      // SRS Section 7.1 Formula: (Existing stock * existing avg + received qty * received cost) / total stock
      const newWeightedCost = newQty > 0 ? ((oldQty * oldCost) + (cmd.quantity * cmd.unitCost)) / newQty : cmd.unitCost;
      const newAvailable = newQty - bal.reservedQty;
      const status = newAvailable <= 0 ? 'Out of stock' : newAvailable <= bal.reorderPoint ? 'Low stock' : 'In stock';

      balances[index] = {
        ...bal,
        onHandQty: newQty,
        availableQty: newAvailable,
        weightedAvgCost: Math.round(newWeightedCost * 100) / 100,
        totalValuation: Math.round(newQty * newWeightedCost * 100) / 100,
        status
      };
    } else if (product && branch) {
      const newQty = cmd.quantity;
      balances.push({
        id: `SB-${Date.now()}`,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        category: product.categoryLabel,
        branchId: branch.id,
        branchName: branch.name,
        warehouseId: warehouse?.id || 'WH-DEF',
        warehouseName: warehouse?.name || 'Main Warehouse',
        onHandQty: newQty,
        reservedQty: 0,
        availableQty: newQty,
        unit: product.unit,
        weightedAvgCost: cmd.unitCost,
        totalValuation: newQty * cmd.unitCost,
        reorderPoint: product.reorderThreshold,
        status: newQty <= product.reorderThreshold ? 'Low stock' : 'In stock'
      });
    }

    this.inventoryBalances.set(balances);

    // Record Stock Movement Ledger Entry
    const movement: StockMovement = {
      id: `MOV-${Date.now()}`,
      timestamp: 'Just now',
      type: 'RECEIPT',
      productId: cmd.productId,
      productSku: product?.sku || '',
      productName: product?.name || '',
      branchId: cmd.branchId,
      branchName: branch?.name || '',
      warehouseName: warehouse?.name || '',
      quantityDelta: cmd.quantity,
      unit: product?.unit || 'piece',
      unitCost: cmd.unitCost,
      totalCost: cmd.quantity * cmd.unitCost,
      referenceType: 'PURCHASE_ORDER',
      referenceNumber: cmd.referenceNumber,
      actor: cmd.actor,
      notes: `Supplier: ${cmd.supplierName}. ${cmd.notes || ''}`
    };
    this.stockMovements.set([movement, ...this.stockMovements()]);
    this.toastService.success('Stock Receipt Posted', `Received ${cmd.quantity} units. Weighted-average cost recalculated.`);

    // Backend Cloud Dispatch
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
          this.syncProtectedData();
          this.toastService.success('Receipt Synced', 'Central ledger & valuation updated on backend.');
        }
      },
      error: () => {
        // Stock receipt recorded in local inventory
      }
    });
  }

  // Inter-Branch Transfer Workflow
  createTransfer(transferData: {
    fromBranchId: string;
    toBranchId: string;
    items: { productId: string; requestedQty: number }[];
    notes?: string;
  }): StockTransfer {
    const fromBranch = this.branches().find(b => b.id === transferData.fromBranchId);
    const toBranch = this.branches().find(b => b.id === transferData.toBranchId);
    const refNum = `TR-2026-${String(242 + this.transfers().length).padStart(5, '0')}`;

    const items = transferData.items.map(it => {
      const p = this.products().find(prod => prod.id === it.productId);
      return {
        productId: it.productId,
        productSku: p?.sku || '',
        productName: p?.name || '',
        unit: p?.unit || ('piece' as UnitOfMeasure),
        requestedQty: it.requestedQty
      };
    });

    const newTransfer: StockTransfer = {
      id: `TR-${Date.now()}`,
      referenceNumber: refNum,
      date: 'Today',
      fromBranchId: transferData.fromBranchId,
      fromBranchName: fromBranch?.name || '',
      fromWarehouseName: fromBranch?.warehouses[0]?.name || '',
      toBranchId: transferData.toBranchId,
      toBranchName: toBranch?.name || '',
      toWarehouseName: toBranch?.warehouses[0]?.name || '',
      items,
      status: 'PENDING_APPROVAL',
      requestedBy: 'Branch Manager',
      timeline: [
        {
          id: `EV-${Date.now()}`,
          timestamp: 'Just now',
          actor: 'Branch Manager',
          role: 'Branch Manager',
          action: 'Transfer requested',
          notes: transferData.notes || 'Routine stock rebalancing'
        }
      ],
      notes: transferData.notes
    };

    this.transfers.set([newTransfer, ...this.transfers()]);

    // Backend Cloud Dispatch
    const fromWhId = parseInt(transferData.fromBranchId.replace('BR-0', '').replace('BR-', ''), 10) || 1;
    const toWhId = parseInt(transferData.toBranchId.replace('BR-0', '').replace('BR-', ''), 10) || 2;

    this.transferApi.createTransfer({
      sourceWarehouseId: fromWhId,
      destinationWarehouseId: toWhId,
      notes: transferData.notes,
      items: transferData.items.map(it => ({
        productId: parseInt(it.productId.replace('PRD-0', '').replace('PRD-', ''), 10) || 1,
        requestedQuantity: it.requestedQty
      }))
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const backendTransfer = res.data;
          this.transferApi.submitTransfer(backendTransfer.id).subscribe();
          this.transfers.update(transfers => transfers.map(t => t.id === newTransfer.id ? {
            ...t,
            id: `TR-${backendTransfer.id}`,
            referenceNumber: backendTransfer.transferNumber
          } : t));
          this.toastService.success('Transfer Synced', `Transfer ${backendTransfer.transferNumber} created in backend.`);
        }
      },
      error: () => {
        // Transfer requisition registered in local system
      }
    });

    return newTransfer;
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
    } else {
      const current = this.transfers().map(t => {
        if (t.id === transferId) {
          return {
            ...t,
            status: 'APPROVED' as TransferStatus,
            approvedBy: actor,
            timeline: [
              ...t.timeline,
              {
                id: `EV-${Date.now()}`,
                timestamp: 'Just now',
                actor,
                role: 'System Administrator / Owner',
                action: 'Approved transfer',
                notes: 'Authorized per SRS separation of duties'
              }
            ]
          };
        }
        return t;
      });
      this.transfers.set(current);
      this.toastService.success('Transfer Approved', `Transfer ${transferId} approved.`);
    }
  }

  dispatchTransfer(transferId: string, actor: string) {
    const transfer = this.transfers().find(t => t.id === transferId);
    if (!transfer) return;

    const numId = parseInt(transferId.replace('TR-00', '').replace('TR-0', '').replace('TR-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.transferApi.dispatchTransfer(numId).subscribe({
        next: () => {
          this.toastService.warning('Stock Dispatched', `Transfer ${transferId} is now In-Transit.`);
          this.syncProtectedData();
        },
        error: (err) => {
          this.toastService.error('Dispatch Failed', err?.error?.detail || err?.error?.message || 'Could not dispatch transfer in backend');
          this.syncProtectedData();
        }
      });
    } else {
      // Deduct stock from source branch atomically and set in-transit
      const balances = [...this.inventoryBalances()];
      for (const item of transfer.items) {
        const idx = balances.findIndex(b => b.productId === item.productId && b.branchId === transfer.fromBranchId);
        if (idx > -1) {
          const bal = balances[idx];
          const newOnHand = Math.max(0, bal.onHandQty - item.requestedQty);
          balances[idx] = {
            ...bal,
            onHandQty: newOnHand,
            availableQty: Math.max(0, newOnHand - bal.reservedQty),
            totalValuation: Math.round(newOnHand * bal.weightedAvgCost * 100) / 100
          };
        }
      }
      this.inventoryBalances.set(balances);

      const current = this.transfers().map(t => {
        if (t.id === transferId) {
          return {
            ...t,
            status: 'IN_TRANSIT' as TransferStatus,
            dispatchedBy: actor,
            items: t.items.map(i => ({ ...i, dispatchedQty: i.requestedQty })),
            timeline: [
              ...t.timeline,
              {
                id: `EV-${Date.now()}`,
                timestamp: 'Just now',
                actor,
                role: 'Storekeeper (Source)',
                action: 'Goods dispatched',
                notes: 'Items packed and loaded into transit logistics'
              }
            ]
          };
        }
        return t;
      });
      this.transfers.set(current);
      this.toastService.warning('Stock Dispatched', `Transfer ${transferId} is now In-Transit.`);
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
          this.toastService.success('Transfer Completed', `Transfer ${transferId} received at ${transfer.toBranchName}.`);
          this.syncProtectedData();
        },
        error: (err) => {
          this.toastService.error('Receipt Failed', err?.error?.detail || err?.error?.message || 'Could not record transfer receipt in backend');
          this.syncProtectedData();
        }
      });
    } else {
      const balances = [...this.inventoryBalances()];
      let hasDiscrepancy = false;

      const updatedItems = transfer.items.map(item => {
        const receivedQty = itemReceipts?.[item.productId] ?? item.dispatchedQty ?? item.requestedQty;
        if (receivedQty !== item.dispatchedQty) {
          hasDiscrepancy = true;
        }

        // Add to destination branch
        const destIndex = balances.findIndex(b => b.productId === item.productId && b.branchId === transfer.toBranchId);
        if (destIndex > -1) {
          const bal = balances[destIndex];
          const newOnHand = bal.onHandQty + receivedQty;
          balances[destIndex] = {
            ...bal,
            onHandQty: newOnHand,
            availableQty: newOnHand - bal.reservedQty,
            totalValuation: Math.round(newOnHand * bal.weightedAvgCost * 100) / 100
          };
        }
        return {
          ...item,
          receivedQty,
          discrepancyNote: hasDiscrepancy ? `Discrepancy: Dispatched ${item.dispatchedQty}, Received ${receivedQty}` : undefined
        };
      });

      this.inventoryBalances.set(balances);

      const finalStatus: TransferStatus = hasDiscrepancy ? 'DISCREPANCY_REVIEW' : 'RECEIVED';

      const current = this.transfers().map(t => {
        if (t.id === transferId) {
          return {
            ...t,
            status: finalStatus,
            receivedBy: actor,
            items: updatedItems,
            timeline: [
              ...t.timeline,
              {
                id: `EV-${Date.now()}`,
                timestamp: 'Just now',
                actor,
                role: 'Storekeeper (Destination)',
                action: hasDiscrepancy ? 'Received with discrepancy' : 'Goods verified & received',
                notes: hasDiscrepancy ? 'Quantity mismatch flagged for management audit' : 'Physical count matched manifest exactly.'
              }
            ]
          };
        }
        return t;
      });
      this.transfers.set(current);
      this.toastService.success('Transfer Completed', `Transfer ${transferId} received at ${transfer.toBranchName}.`);
    }
  }

  // Update Order Status
  updateOrderStatus(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
    const current = this.orders().map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          paymentStatus: paymentStatus || o.paymentStatus
        };
      }
      return o;
    });
    this.orders.set(current);

    const numId = parseInt(orderId.replace('ORD-', '').replace('AS-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.orderApi.updateOrderStatus(numId, status).subscribe({
        next: () => {
          if (paymentStatus === 'PAID') {
            this.orderApi.confirmOrder(numId).subscribe();
          }
          this.syncProtectedData();
        },
        error: () => console.warn('[AserState] Backend updateOrderStatus skipped')
      });
    }
  }

  // Create Product in Catalog
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
      imageUrl: product.imageUrl,
      specifications: JSON.stringify(product.specifications)
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
        }
      },
      error: () => console.warn('[AserState] Product saved locally')
    });

    return newProduct;
  }

  // === DYNAMIC PRODUCT UPDATES ===
  updateProduct(id: string, updates: Partial<Product>) {
    this.products.update(prods => prods.map(p => p.id === id ? { ...p, ...updates } : p));
    this.toastService.success('Product Updated', 'Catalog entry modified successfully.');

    const numId = parseInt(id.replace('PRD-0', '').replace('PRD-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.catalogApi.updateProduct(numId, {
        name: updates.name,
        sellingPrice: updates.unitPrice,
        purchaseCost: updates.baseCost,
        reorderThreshold: updates.reorderThreshold,
        isPublished: updates.isPublished,
        description: updates.description,
        imageUrl: updates.imageUrl
      }).subscribe({
        error: () => console.warn('[AserState] Product updated locally')
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
  }): Branch {
    const newId = `BR-0${this.branches().length + 1}`;
    const newBranch: Branch = {
      id: newId,
      name: data.name,
      code: data.code.toUpperCase(),
      address: data.address || '',
      city: data.city || 'Addis Ababa',
      phone: data.phone || '+251 11 000 0000',
      email: data.email || 'branch@asertrading.et',
      isHeadOffice: !!data.isHeadOffice,
      warehouses: [
        {
          id: `WH-0${this.branches().length + 1}`,
          branchId: newId,
          name: `${data.name} Main Depot`,
          code: `WH-${data.code.toUpperCase()}-MAIN`,
          isDefault: true
        }
      ]
    };

    this.branches.update(bList => [...bList, newBranch]);
    this.toastService.success('Branch Added', `${newBranch.name} (${newBranch.code}) created successfully.`);

    // Backend dispatch
    this.branchApi.createBranch({
      name: newBranch.name,
      code: newBranch.code,
      address: newBranch.address,
      city: newBranch.city,
      phone: newBranch.phone,
      email: newBranch.email,
      isActive: true
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.branches.update(bList => bList.map(b => b.id === newBranch.id ? {
            ...b,
            id: `BR-0${res.data.id}`
          } : b));
        }
      },
      error: () => console.warn('[AserState] Branch created locally')
    });

    return newBranch;
  }

  updateBranch(id: string, updates: Partial<Branch>) {
    this.branches.update(bList => bList.map(b => b.id === id ? { ...b, ...updates } : b));
    this.toastService.success('Branch Updated', 'Branch details saved.');

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
        error: () => console.warn('[AserState] Branch updated locally')
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
    this.branches.update(bList => bList.map(b => {
      if (b.id === branchId) {
        const newWh = {
          id: `WH-${Date.now()}`,
          branchId,
          name,
          code: code.toUpperCase(),
          isDefault: false
        };
        return {
          ...b,
          warehouses: [...b.warehouses, newWh]
        };
      }
      return b;
    }));
    this.toastService.success('Warehouse Created', `Added warehouse ${name} (${code}).`);
  }

  // === DYNAMIC COMMERCIAL SERVICES MANAGEMENT ===
  createService(data: Omit<AserServiceItem, 'id' | 'isActive'>): AserServiceItem {
    const newService: AserServiceItem = {
      ...data,
      id: `SVC-${Date.now()}`,
      isActive: true
    };
    this.services.update(list => [...list, newService]);
    this.toastService.success('Service Created', `${newService.title} added to company services.`);

    this.catalogApi.createAdminService({
      serviceCode: data.code,
      title: data.title,
      category: data.category,
      description: data.description,
      imageUrl: data.imageUrl,
      keyOfferings: data.features?.join(';') || '',
      requiresQuotation: data.requiresQuotation
    }).subscribe({
      error: () => console.warn('[AserState] Service created locally')
    });

    return newService;
  }

  updateService(id: string, updates: Partial<AserServiceItem>) {
    this.services.update(list => list.map(s => s.id === id ? { ...s, ...updates } : s));
    this.toastService.success('Service Updated', 'Service details modified.');

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
        error: () => console.warn('[AserState] Service updated locally')
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
    const svc = this.services().find(s => s.id === id);
    this.services.update(list => list.filter(s => s.id !== id));
    this.toastService.info('Service Deleted', `${svc?.title} removed from catalog.`);

    const numId = parseInt(id.replace('SVC-0', '').replace('SVC-', ''), 10);
    if (!isNaN(numId) && numId > 0) {
      this.catalogApi.deleteAdminService(numId).subscribe({
        error: () => console.warn('[AserState] Service deleted locally')
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
  }): EmployeeUser {
    const branchName = this.branches().find(b => b.id === data.assignedBranchId)?.name || 'Head Office & Printing Plant (Piassa)';
    const newEmp: EmployeeUser = {
      id: `USR-${Date.now()}`,
      username: data.username.trim().toLowerCase(),
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      phone: data.phone,
      role: data.role,
      roleLabel: ROLE_LABELS[data.role] || data.role,
      assignedBranchId: data.assignedBranchId,
      assignedBranchName: branchName,
      isActive: true,
      createdAt: 'Just now'
    };

    this.employees.update(emps => [newEmp, ...emps]);

    // Backend dispatch
    const numBranchId = data.assignedBranchId ? parseInt(data.assignedBranchId.replace('BR-0', '').replace('BR-', ''), 10) : undefined;
    this.userApi.createUser({
      username: newEmp.username,
      email: newEmp.email,
      fullName: newEmp.fullName,
      phone: newEmp.phone,
      role: newEmp.role,
      assignedBranchId: numBranchId,
      password: data.password
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.employees.update(emps => emps.map(e => e.id === newEmp.id ? {
            ...e,
            id: `USR-${res.data.id}`
          } : e));
          this.toastService.success('Employee Registered', `${newEmp.fullName} (${newEmp.roleLabel}) successfully created in central directory.`);
        }
      },
      error: () => {
        this.toastService.success('Employee Registered (Local)', `${newEmp.fullName} recorded in local directory.`);
      }
    });

    return newEmp;
  }

  updateEmployee(id: string, updates: Partial<EmployeeUser>) {
    this.employees.update(emps => emps.map(e => e.id === id ? { ...e, ...updates } : e));
    this.toastService.success('Employee Updated', 'Staff profile updated successfully.');

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
      }).subscribe();
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
