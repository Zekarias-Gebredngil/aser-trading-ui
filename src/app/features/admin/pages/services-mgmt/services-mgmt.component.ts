import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { AserServiceItem, ServiceCategory } from '../../../../core/models/quote.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-services-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, IconComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './services-mgmt.component.html',
  styleUrl: './services-mgmt.component.css'
})
export class ServicesMgmtComponent {
  readonly state = inject(AserStateService);
  private readonly catalogApi = inject(CatalogApiService);

  isCreateModalOpen = signal(false);
  isEditModalOpen = signal(false);
  selectedService = signal<AserServiceItem | null>(null);

  // Pagination
  currentPage = 1;
  pageSize = 10;

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

  get pagedServices(): AserServiceItem[] {
    const list = this.state.services();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  // Form model
  serviceForm = {
    code: '',
    title: '',
    category: 'PRINTING_PRESS' as ServiceCategory,
    categoryLabel: 'Printing Press Services',
    description: '',
    icon: 'lucide:printer',
    featuresText: '',
    requiresQuotation: true,
    images: [] as string[]
  };

  serviceImageUrlInput = '';

  onServiceFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        this.catalogApi.uploadMedia(file, 'services').subscribe({
          next: (res) => {
            if (res.success && res.data?.url) {
              this.serviceForm.images.push(res.data.url);
            }
          },
          error: (err) => {
            console.error('Failed to upload service image to cloud storage:', err);
          }
        });
      });
      input.value = '';
    }
  }

  addServiceImageUrl() {
    const url = this.serviceImageUrlInput.trim();
    if (url) {
      this.serviceForm.images.push(url);
      this.serviceImageUrlInput = '';
    }
  }

  removeServiceImage(index: number) {
    if (index >= 0 && index < this.serviceForm.images.length) {
      this.serviceForm.images.splice(index, 1);
    }
  }

  categoryOptions: { key: ServiceCategory; label: string }[] = [
    { key: 'PRINTING_PRESS', label: 'Printing Press Services' },
    { key: 'BRANDING_PROMOTION', label: 'Branding & Promotion' },
    { key: 'GARMENT_MATERIALS', label: 'Garment Materials & Vinyl' },
    { key: 'EQUIPMENT_DISTRIBUTION', label: 'Equipment & Maintenance' },
    { key: 'PRINTING_SUPPLIES', label: 'Printing Supplies & Paper' }
  ];

  iconOptions = [
    { value: 'lucide:briefcase', label: 'Commercial Services' },
    { value: 'lucide:award', label: 'Branding & Promotion' },
    { value: 'lucide:printer', label: 'Printer / Press' },
    { value: 'lucide:shirt', label: 'Apparel / Garment' },
    { value: 'lucide:wrench', label: 'Maintenance / Tools' },
    { value: 'lucide:package', label: 'Package / Supply' },
    { value: 'lucide:layers', label: 'Layers / Materials' }
  ];

  onCategoryChange(cat: ServiceCategory): void {
    this.serviceForm.category = cat;
    const opt = this.categoryOptions.find(o => o.key === cat);
    if (opt) {
      this.serviceForm.categoryLabel = opt.label;
    }
  }

  openCreateModal() {
    this.serviceForm = {
      code: '',
      title: '',
      category: 'PRINTING_PRESS',
      categoryLabel: 'Printing Press Services',
      description: '',
      icon: 'lucide:printer',
      featuresText: 'High-speed automated production\nISO-certified commercial quality\nDigital soft-proof before print run\nNationwide distribution logistics',
      requiresQuotation: true,
      images: []
    };
    this.serviceImageUrlInput = '';
    this.isCreateModalOpen.set(true);
  }

  openEditModal(service: AserServiceItem) {
    this.selectedService.set(service);
    this.serviceForm = {
      code: service.code,
      title: service.title,
      category: service.category,
      categoryLabel: service.categoryLabel,
      description: service.description,
      icon: service.icon,
      featuresText: service.features.join('\n'),
      requiresQuotation: service.requiresQuotation,
      images: service.images ? [...service.images] : (service.imageUrl ? [service.imageUrl] : [])
    };
    this.serviceImageUrlInput = '';
    this.isEditModalOpen.set(true);
  }

  saveNewService() {
    if (!this.serviceForm.title || !this.serviceForm.code) return;
    const features = this.serviceForm.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    this.state.createService({
      code: this.serviceForm.code.toUpperCase(),
      title: this.serviceForm.title,
      category: this.serviceForm.category,
      categoryLabel: this.serviceForm.categoryLabel,
      description: this.serviceForm.description,
      icon: this.serviceForm.icon,
      imageUrl: this.serviceForm.images[0] || undefined,
      images: this.serviceForm.images.length > 0 ? [...this.serviceForm.images] : undefined,
      features,
      requiresQuotation: this.serviceForm.requiresQuotation
    });
    this.isCreateModalOpen.set(false);
  }

  saveServiceEdit() {
    const service = this.selectedService();
    if (!service || !this.serviceForm.title) return;
    const features = this.serviceForm.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    this.state.updateService(service.id, {
      code: this.serviceForm.code.toUpperCase(),
      title: this.serviceForm.title,
      category: this.serviceForm.category,
      categoryLabel: this.serviceForm.categoryLabel,
      description: this.serviceForm.description,
      icon: this.serviceForm.icon,
      imageUrl: this.serviceForm.images[0] || undefined,
      images: this.serviceForm.images.length > 0 ? [...this.serviceForm.images] : undefined,
      features,
      requiresQuotation: this.serviceForm.requiresQuotation
    });
    this.isEditModalOpen.set(false);
  }

  toggleActive(service: AserServiceItem) {
    this.state.toggleServiceActive(service.id);
  }

  deleteService(service: AserServiceItem) {
    if (confirm(`Delete service "${service.title}"? It will be removed from website and inquiry menus.`)) {
      this.state.deleteService(service.id);
    }
  }
}

