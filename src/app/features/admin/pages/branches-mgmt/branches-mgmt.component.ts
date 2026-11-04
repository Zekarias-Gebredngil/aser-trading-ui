import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { Branch } from '../../../../core/models/inventory.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

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

  // Form Model for Warehouse
  warehouseForm = {
    branchId: '',
    name: '',
    code: ''
  };

  openCreateModal() {
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

  openEditModal(branch: Branch) {
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
    this.isEditModalOpen.set(true);
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
    if (!this.branchForm.name || !this.branchForm.code) return;
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
    const branch = this.selectedBranch();
    if (!branch || !this.branchForm.name) return;
    this.state.updateBranch(branch.id, {
      name: this.branchForm.name,
      code: this.branchForm.code,
      city: this.branchForm.city,
      address: this.branchForm.address,
      phone: this.branchForm.phone,
      email: this.branchForm.email
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
