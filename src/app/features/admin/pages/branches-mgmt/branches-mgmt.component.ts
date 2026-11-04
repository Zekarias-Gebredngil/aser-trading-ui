import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { Branch } from '../../../../core/models/inventory.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-branches-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, IconComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './branches-mgmt.component.html',
  styleUrl: './branches-mgmt.component.css'
})
export class BranchesMgmtComponent {
  readonly state = inject(AserStateService);

  isCreateModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isWarehouseModalOpen = signal(false);

  selectedBranch = signal<Branch | null>(null);

  // Pagination
  currentPage = 1;
  pageSize = 5;

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
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

  get pagedBranches(): Branch[] {
    const list = this.state.branches();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
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
