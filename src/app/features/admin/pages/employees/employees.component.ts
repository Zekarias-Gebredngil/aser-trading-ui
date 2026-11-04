import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { EmployeeUser, StaffRole, ROLE_LABELS, ROLE_PERMISSIONS, Permission } from '../../../../core/models/user.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface EmployeeRowViewModel {
  readonly id: string;
  readonly initial: string;
  readonly fullName: string;
  readonly username: string;
  readonly role: StaffRole;
  readonly roleLabel: string;
  readonly branchDisplay: string;
  readonly email: string;
  readonly phone?: string;
  readonly isActive: boolean;
  readonly statusTextKey: string;
  readonly statusDefaultText: string;
  readonly rawEmployee: EmployeeUser;
}

@Component({
  selector: 'aser-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, IconComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.css'
})
export class EmployeesComponent {
  readonly state = inject(AserStateService);

  activeTab = signal<'list' | 'matrix'>('list');
  isRegisterModalOpen = signal(false);
  isEditModalOpen = signal(false);
  selectedEmployee = signal<EmployeeUser | null>(null);

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Search & Filter
  searchQuery = signal<string>('');
  selectedRoleFilter = signal<string>('ALL');

  // Registration Form
  regForm = {
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: 'BRANCH_MANAGER' as StaffRole,
    assignedBranchId: 'BR-02',
    password: ''
  };

  // Edit Form
  editForm = {
    fullName: '',
    email: '',
    phone: '',
    role: 'BRANCH_MANAGER' as StaffRole,
    assignedBranchId: '',
    isActive: true
  };

  availableRoles: { key: StaffRole; label: string }[] = [
    { key: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator (Full Access)' },
    { key: 'COMPANY_MANAGER', label: 'Company Manager (Executive Oversight)' },
    { key: 'INVENTORY_MANAGER', label: 'Inventory Manager (Stock & Catalog)' },
    { key: 'BRANCH_MANAGER', label: 'Branch Manager (Branch Operations)' },
    { key: 'STOREKEEPER', label: 'Storekeeper (Receipts & Counts)' },
    { key: 'SALES_OFFICER', label: 'Sales Officer (Orders & Quotations)' },
    { key: 'ACCOUNTANT_AUDITOR', label: 'Accountant / Auditor (Ledger & Audit)' }
  ];

  permissionList: { key: Permission; label: string; desc: string }[] = [
    { key: 'MANAGE_BRANCHES', label: 'Manage Branches', desc: 'Create, edit & configure branches and warehouses' },
    { key: 'MANAGE_PRODUCTS', label: 'Manage Products', desc: 'Add, update prices, and archive catalog products' },
    { key: 'MANAGE_SERVICES', label: 'Manage Services', desc: 'Configure commercial service lines and quotes' },
    { key: 'MANAGE_EMPLOYEES', label: 'Manage Employees', desc: 'Register staff, assign roles and branches' },
    { key: 'VIEW_INVENTORY', label: 'View Inventory', desc: 'Check stock balances across warehouses' },
    { key: 'RECEIVE_STOCK', label: 'Receive Stock', desc: 'Post receipts and recalculate weighted-average cost' },
    { key: 'REQUEST_TRANSFER', label: 'Request Transfer', desc: 'Initiate inter-branch transfer requests' },
    { key: 'APPROVE_TRANSFER', label: 'Approve Transfer', desc: 'Authorize transfer dispatches between branches' },
    { key: 'DISPATCH_TRANSFER', label: 'Dispatch Transfer', desc: 'Hand over stock to logistics/transit' },
    { key: 'RECEIVE_TRANSFER', label: 'Receive Transfer', desc: 'Physical verification and discrepancy audit' },
    { key: 'MANAGE_ORDERS', label: 'Manage Orders', desc: 'Fulfill customer orders & verify bank payments' },
    { key: 'VIEW_FINANCIALS', label: 'View Financials', desc: 'Inventory valuation, margins, and purchase costs' },
    { key: 'ACCESS_ALL_BRANCHES', label: 'Multi-Branch Scope', desc: 'Access consolidated view across all branches' }
  ];

  filteredEmployees() {
    const q = this.searchQuery().toLowerCase().trim();
    const roleFilter = this.selectedRoleFilter();

    return this.state.employees().filter(emp => {
      const matchRole = roleFilter === 'ALL' || emp.role === roleFilter;
      const matchQuery = !q ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.username.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        (emp.assignedBranchName && emp.assignedBranchName.toLowerCase().includes(q));

      return matchRole && matchQuery;
    });
  }

  pagedEmployees(): EmployeeUser[] {
    const list = this.filteredEmployees();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get pagedEmployeeRows(): readonly EmployeeRowViewModel[] {
    return this.pagedEmployees().map(emp => ({
      id: emp.id,
      initial: (emp.fullName || 'U').charAt(0).toUpperCase(),
      fullName: emp.fullName,
      username: emp.username,
      role: emp.role,
      roleLabel: emp.roleLabel,
      branchDisplay: emp.assignedBranchName || 'Consolidated HQ / All',
      email: emp.email,
      phone: emp.phone,
      isActive: emp.isActive,
      statusTextKey: emp.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE',
      statusDefaultText: emp.isActive ? 'Active' : 'Suspended',
      rawEmployee: emp
    }));
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  setActiveTab(tab: 'list' | 'matrix'): void {
    this.activeTab.set(tab);
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage = 1;
  }

  onRoleFilterChange(role: string): void {
    this.selectedRoleFilter.set(role);
    this.currentPage = 1;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  getRoleShortTitle(label?: string): string {
    if (!label) return '—';
    return label.split('(')[0].trim();
  }

  closeRegisterModal(): void {
    this.isRegisterModalOpen.set(false);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  hasRolePerm(role: StaffRole, perm: Permission): boolean {
    return (ROLE_PERMISSIONS[role] || []).includes(perm);
  }

  openRegisterModal() {
    this.regForm = {
      fullName: '',
      username: '',
      email: '',
      phone: '',
      role: 'BRANCH_MANAGER',
      assignedBranchId: this.state.branches()[1]?.id || this.state.branches()[0]?.id || 'BR-01',
      password: ''
    };
    this.isRegisterModalOpen.set(true);
  }

  openEditModal(emp: EmployeeUser) {
    this.selectedEmployee.set(emp);
    this.editForm = {
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone || '',
      role: emp.role,
      assignedBranchId: emp.assignedBranchId || this.state.branches()[0]?.id || 'BR-01',
      isActive: emp.isActive
    };
    this.isEditModalOpen.set(true);
  }

  saveEmployee() {
    if (!this.regForm.fullName || !this.regForm.username || !this.regForm.email || !this.regForm.password) {
      return;
    }

    this.state.registerEmployee({
      fullName: this.regForm.fullName,
      username: this.regForm.username,
      email: this.regForm.email,
      phone: this.regForm.phone,
      role: this.regForm.role,
      assignedBranchId: this.regForm.assignedBranchId,
      password: this.regForm.password
    });

    this.isRegisterModalOpen.set(false);
  }

  saveEdit() {
    const emp = this.selectedEmployee();
    if (!emp) return;

    const branch = this.state.branches().find(b => b.id === this.editForm.assignedBranchId);
    this.state.updateEmployee(emp.id, {
      fullName: this.editForm.fullName,
      email: this.editForm.email,
      phone: this.editForm.phone,
      role: this.editForm.role,
      roleLabel: ROLE_LABELS[this.editForm.role] || this.editForm.role,
      assignedBranchId: this.editForm.assignedBranchId,
      assignedBranchName: branch?.name,
      isActive: this.editForm.isActive
    });

    this.isEditModalOpen.set(false);
  }

  toggleStatus(emp: EmployeeUser) {
    this.state.toggleEmployeeStatus(emp.id);
  }
}

