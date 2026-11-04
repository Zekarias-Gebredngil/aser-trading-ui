import { Routes } from '@angular/router';
import { HomeComponent } from './features/public/pages/home/home.component';
import { ServicesComponent } from './features/public/pages/services/services.component';
import { ProductsCatalogComponent } from './features/public/pages/products-catalog/products-catalog.component';
import { BranchesComponent } from './features/public/pages/branches/branches.component';
import { DashboardComponent } from './features/admin/pages/dashboard/dashboard.component';
import { InventoryComponent } from './features/admin/pages/inventory/inventory.component';
import { ProductsComponent } from './features/admin/pages/products/products.component';
import { TransfersComponent } from './features/admin/pages/transfers/transfers.component';
import { OrdersComponent } from './features/admin/pages/orders/orders.component';
import { BranchesMgmtComponent } from './features/admin/pages/branches-mgmt/branches-mgmt.component';
import { ServicesMgmtComponent } from './features/admin/pages/services-mgmt/services-mgmt.component';
import { EmployeesComponent } from './features/admin/pages/employees/employees.component';
import { ReportsComponent } from './features/admin/pages/reports/reports.component';
import { ActivityLogComponent } from './features/admin/pages/activity-log/activity-log.component';
import { SettingsComponent } from './features/admin/pages/settings/settings.component';
import { StaffLoginComponent } from './features/admin/pages/login/staff-login.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  // Public Customer Storefront & Marketing
  { path: '', component: HomeComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'products', component: ProductsCatalogComponent },
  { path: 'branches', component: BranchesComponent },

  // Staff Authentication Entry
  { path: 'app/login', component: StaffLoginComponent },

  // Admin & Multi-Branch Operations Portal (Protected by Auth & Permission Guards)
  { path: 'app', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'app/inventory', component: InventoryComponent, canActivate: [authGuard, permissionGuard('VIEW_INVENTORY')] },
  { path: 'app/products', component: ProductsComponent, canActivate: [authGuard, permissionGuard('MANAGE_PRODUCTS')] },
  { path: 'app/services', component: ServicesMgmtComponent, canActivate: [authGuard, permissionGuard('MANAGE_SERVICES')] },
  { path: 'app/transfers', component: TransfersComponent, canActivate: [authGuard, permissionGuard('REQUEST_TRANSFER')] },
  { path: 'app/orders', component: OrdersComponent, canActivate: [authGuard, permissionGuard('MANAGE_ORDERS')] },
  { path: 'app/branches', component: BranchesMgmtComponent, canActivate: [authGuard, permissionGuard('MANAGE_BRANCHES')] },
  { path: 'app/employees', component: EmployeesComponent, canActivate: [authGuard, permissionGuard('MANAGE_EMPLOYEES')] },

  // System Administration Only (Visible strictly to SYSTEM_ADMINISTRATOR)
  { path: 'app/reports', component: ReportsComponent, canActivate: [authGuard, permissionGuard('VIEW_REPORTS')] },
  { path: 'app/activity-log', component: ActivityLogComponent, canActivate: [authGuard, permissionGuard('SYSTEM_CONFIG')] },
  { path: 'app/settings', component: SettingsComponent, canActivate: [authGuard, permissionGuard('SYSTEM_CONFIG')] },

  { path: '**', redirectTo: '' }
];
