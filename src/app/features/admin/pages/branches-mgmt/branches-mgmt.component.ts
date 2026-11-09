import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { Branch } from '../../../../core/models/inventory.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { isValidEmail, isValidPhone } from '../../../../core/utils/validators';

export interface EditableWarehouseItem {
  id?: string;
  numId?: number;
  name: string;
  code: string;
  isDefault: boolean;
  isNew?: boolean;
}

export interface AdminBranchWarehouseViewModel {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly isDefault: boolean;
}

export interface AdminBranchCardViewModel {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isHeadOffice: boolean;
  readonly city: string;
  readonly address: string;
  readonly phone: string;
  readonly email: string;
  readonly warehouses: readonly AdminBranchWarehouseViewModel[];
  readonly warehouseCount: number;
  readonly raw: Branch;
}

@Component({
  selector: 'aser-branches-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, IconComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './branches-mgmt.component.html',
  styleUrl: './branches-mgmt.component.css'
})
export class BranchesMgmtComponent {
  readonly state = inject(AserStateService);

  readonly isCreateModalOpen = signal(false);
  readonly isEditModalOpen = signal(false);
  readonly isWarehouseModalOpen = signal(false);
  readonly selectedBranch = signal<Branch | null>(null);

  // Pagination Signals
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);

  readonly canManageBranches = computed<boolean>(() => this.state.hasPermission('MANAGE_BRANCHES'));
  readonly totalBranchesCount = computed<number>(() => this.state.branches().length);

  readonly pagedBranchCards = computed<readonly AdminBranchCardViewModel[]>(() => {
    const list = this.state.branches();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize()).map(b => ({
      id: b.id,
      code: b.code,
      name: b.name,
      isHeadOffice: !!b.isHeadOffice,
      city: b.city,
      address: b.address,
      phone: b.phone,
      email: b.email,
      warehouses: (b.warehouses || []).map(w => ({
        id: w.id,
        name: w.name,
        code: w.code,
        isDefault: !!w.isDefault
      })),
      warehouseCount: b.warehouses ? b.warehouses.length : 0,
      raw: b
    }));
  });

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  closeWarehouseModal(): void {
    this.isWarehouseModalOpen.set(false);
  }

  // Form Model for Branch
  branchForm = {
    name: '',
    code: '',
    city: 'Addis Ababa',
    address: '',
    phone: '',
    email: '',
    isHeadOffice: false
  };

  branchSubmitted = false;

  get branchNameError(): string | null {
    if (this.branchSubmitted && !this.branchForm.name.trim()) return 'Branch name is required.';
    return null;
  }

  get branchCodeError(): string | null {
    if (this.branchSubmitted && !this.branchForm.code.trim()) return 'Branch code is required (e.g. BR-03).';
    return null;
  }

  get branchEmailError(): string | null {
    const val = this.branchForm.email?.trim();
    if (val && !isValidEmail(val)) return 'Please enter a valid contact email.';
    return null;
  }

  get branchPhoneError(): string | null {
    const val = this.branchForm.phone?.trim();
    if (val && !isValidPhone(val)) return 'Please enter a valid contact phone (e.g. +251 22 112 3456).';
    return null;
  }

  // Form Model for Warehouse
  warehouseForm = {
    branchId: '',
    name: '',
    code: ''
  };

  openCreateModal() {
    this.branchSubmitted = false;
    this.branchForm = {
      name: '',
      code: '',
      city: 'Addis Ababa',
      address: '',
      phone: '',
      email: '',
      isHeadOffice: false
    };
    this.isCreateModalOpen.set(true);
  }

  editableWarehouses: EditableWarehouseItem[] = [];

  openEditModal(branch: Branch) {
    this.branchSubmitted = false;
    this.selectedBranch.set(branch);
    this.branchForm = {
      name: branch.name,
      code: branch.code,
      city: branch.city,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isHeadOffice: !!branch.isHeadOffice
    };

    this.editableWarehouses = (branch.warehouses || []).map(w => ({
      id: w.id,
      numId: parseInt(w.id.replace(/\D/g, ''), 10) || undefined,
      name: w.name,
      code: w.code,
      isDefault: !!w.isDefault
    }));

    if (this.editableWarehouses.length === 0) {
      this.editableWarehouses.push({
        name: `${branch.name} Warehouse`,
        code: `${(branch.code || 'BR').toUpperCase()}-WH`,
        isDefault: true,
        isNew: true
      });
    }

    this.isEditModalOpen.set(true);
  }

  addWarehouseInEdit(): void {
    const branchCode = (this.branchForm.code || 'BR').trim().toUpperCase();
    const suffix = this.editableWarehouses.length + 1;
    this.editableWarehouses.push({
      name: `${this.branchForm.name || 'Branch'} Depot ${suffix}`,
      code: `${branchCode}-WH${suffix}`,
      isDefault: this.editableWarehouses.length === 0,
      isNew: true
    });
  }

  removeWarehouseInEdit(index: number): void {
    if (this.editableWarehouses.length <= 1) {
      alert('A branch must have at least one storage warehouse.');
      return;
    }
    const wasDefault = this.editableWarehouses[index].isDefault;
    this.editableWarehouses.splice(index, 1);
    if (wasDefault && this.editableWarehouses.length > 0) {
      this.editableWarehouses[0].isDefault = true;
    }
  }

  setDefaultWarehouseInEdit(index: number): void {
    this.editableWarehouses.forEach((w, i) => {
      w.isDefault = (i === index);
    });
  }

  openAddWarehouseModal(branch: Branch) {
    this.selectedBranch.set(branch);
    this.warehouseForm = {
      branchId: branch.id,
      name: '',
      code: ''
    };
    this.isWarehouseModalOpen.set(true);
  }

  saveNewBranch() {
    this.branchSubmitted = true;
    if (
      !this.branchForm.name.trim() ||
      !this.branchForm.code.trim() ||
      (this.branchForm.email && !isValidEmail(this.branchForm.email)) ||
      (this.branchForm.phone && !isValidPhone(this.branchForm.phone))
    ) {
      return;
    }
    this.state.createBranch({
      name: this.branchForm.name,
      code: this.branchForm.code,
      city: this.branchForm.city,
      address: this.branchForm.address,
      phone: this.branchForm.phone,
      email: this.branchForm.email,
      isHeadOffice: this.branchForm.isHeadOffice
    });
    this.isCreateModalOpen.set(false);
  }

  saveBranchEdit() {
    this.branchSubmitted = true;
    const branch = this.selectedBranch();
    if (
      !branch ||
      !this.branchForm.name.trim() ||
      !this.branchForm.code.trim() ||
      (this.branchForm.email && !isValidEmail(this.branchForm.email)) ||
      (this.branchForm.phone && !isValidPhone(this.branchForm.phone))
    ) {
      return;
    }

    // Validate warehouse inputs
    for (const wh of this.editableWarehouses) {
      if (!wh.name.trim() || !wh.code.trim()) {
        alert('All associated warehouses must have a name and code.');
        return;
      }
    }

    this.state.updateBranch(branch.id, {
      name: this.branchForm.name.trim(),
      code: this.branchForm.code.trim().toUpperCase(),
      city: this.branchForm.city,
      address: this.branchForm.address,
      phone: this.branchForm.phone,
      email: this.branchForm.email,
      warehouses: this.editableWarehouses.map(w => ({
        id: w.numId,
        name: w.name.trim(),
        code: w.code.trim().toUpperCase(),
        isDefault: w.isDefault
      }))
    });
    this.isEditModalOpen.set(false);
  }

  saveNewWarehouse() {
    const branch = this.selectedBranch();
    if (!branch || !this.warehouseForm.name || !this.warehouseForm.code) return;
    this.state.addWarehouse(branch.id, this.warehouseForm.name, this.warehouseForm.code);
    this.isWarehouseModalOpen.set(false);
  }

  deleteBranch(branch: Branch) {
    if (confirm(`Are you sure you want to remove branch "${branch.name}"?`)) {
      this.state.deleteBranch(branch.id);
    }
  }
}
