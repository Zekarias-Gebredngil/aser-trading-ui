import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { AddProductModalComponent } from '../../components/add-product-modal/add-product-modal.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Product } from '../../../../core/models/product.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface AdminProductRowViewModel {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly amharicName?: string;
  readonly categoryLabel: string;
  readonly unit: string;
  readonly pricingType: string;
  readonly isFixedPrice: boolean;
  readonly unitPrice: number;
  readonly reorderThreshold: number;
  readonly isPublished: boolean;
  readonly pricingBadgeClass: string;
  readonly pricingLabelKey: string;
  readonly pricingLabelDefault: string;
  readonly storefrontBadgeClass: string;
  readonly storefrontLabelKey: string;
  readonly storefrontLabelDefault: string;
  readonly toggleActionLabelKey: string;
  readonly toggleActionLabelDefault: string;
  readonly raw: Product;
}

@Component({
  selector: 'aser-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AdminShellComponent, AddProductModalComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {
  readonly state = inject(AserStateService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly excelService = inject(ExcelExportService);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('ALL');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly isAddModalOpen = signal(false);
  readonly isEditModalOpen = signal(false);
  readonly selectedProduct = signal<Product | null>(null);

  readonly canManageProducts = computed<boolean>(() => this.state.hasPermission('MANAGE_PRODUCTS'));

  readonly filteredProducts = computed<readonly Product[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.state.products().filter(p => {
      const matchesCat = cat === 'ALL' || p.category === cat;
      const matchesSearch = !q || `${p.name} ${p.sku} ${p.categoryLabel} ${p.amharicName || ''}`.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  });

  readonly filteredCount = computed<number>(() => this.filteredProducts().length);

  readonly pagedProductRows = computed<readonly AdminProductRowViewModel[]>(() => {
    const list = this.filteredProducts();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize()).map(p => {
      const isFixed = p.pricingType === 'FIXED';
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        amharicName: p.amharicName,
        categoryLabel: p.categoryLabel,
        unit: p.unit,
        pricingType: p.pricingType,
        isFixedPrice: isFixed,
        unitPrice: p.unitPrice,
        reorderThreshold: p.reorderThreshold,
        isPublished: p.isPublished,
        pricingBadgeClass: isFixed ? 'badge-in-stock' : 'badge-quote-only',
        pricingLabelKey: isFixed ? 'PRODUCTS.FIXED_PRICE' : 'PRODUCTS.QUOTATION_ONLY',
        pricingLabelDefault: isFixed ? 'Fixed Price' : 'Quotation Only',
        storefrontBadgeClass: p.isPublished ? 'badge-in-stock' : 'badge-limited',
        storefrontLabelKey: p.isPublished ? 'PRODUCTS.PUBLISHED' : 'PRODUCTS.HIDDEN',
        storefrontLabelDefault: p.isPublished ? 'Published' : 'Hidden (Draft)',
        toggleActionLabelKey: p.isPublished ? 'COMMON.CLOSE' : 'PRODUCTS.PUBLISHED',
        toggleActionLabelDefault: p.isPublished ? 'Hide' : 'Publish',
        raw: p
      };
    });
  });

  editForm = {
    name: '',
    amharicName: '',
    unitPrice: 0,
    baseCost: 0,
    reorderThreshold: 10,
    description: '',
    isPublished: true,
    images: [] as string[]
  };

  editImageUrlInput = '';

  onEditFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        this.catalogApi.uploadMedia(file).subscribe({
          next: (res) => {
            if (res.success && res.data?.url) {
              this.editForm.images.push(res.data.url);
            }
          },
          error: (err) => {
            console.error('Failed to upload edit image:', err);
            const reader = new FileReader();
            reader.onload = (e: any) => {
              const res = e.target.result as string;
              if (res) {
                this.editForm.images.push(res);
              }
            };
            reader.readAsDataURL(file);
          }
        });
      });
      input.value = '';
    }
  }

  addEditImageUrl(): void {
    const url = this.editImageUrlInput.trim();
    if (url) {
      this.editForm.images.push(url);
      this.editImageUrlInput = '';
    }
  }

  removeEditImage(index: number): void {
    if (index >= 0 && index < this.editForm.images.length) {
      this.editForm.images.splice(index, 1);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onCategoryChange(cat: string): void {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  openAddModal(): void {
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  togglePublish(product: Product) {
    this.state.updateProduct(product.id, { isPublished: !product.isPublished });
  }

  openEditModal(product: Product) {
    this.selectedProduct.set(product);
    this.editForm = {
      name: product.name,
      amharicName: product.amharicName || '',
      unitPrice: product.unitPrice,
      baseCost: product.baseCost,
      reorderThreshold: product.reorderThreshold,
      description: product.description,
      isPublished: product.isPublished,
      images: product.images ? [...product.images] : (product.imageUrl ? [product.imageUrl] : [])
    };
    this.editImageUrlInput = '';
    this.isEditModalOpen.set(true);
  }

  saveEdit() {
    const product = this.selectedProduct();
    if (!product) return;
    this.state.updateProduct(product.id, {
      name: this.editForm.name,
      amharicName: this.editForm.amharicName,
      unitPrice: Number(this.editForm.unitPrice),
      baseCost: Number(this.editForm.baseCost),
      reorderThreshold: Number(this.editForm.reorderThreshold),
      description: this.editForm.description,
      isPublished: this.editForm.isPublished,
      imageUrl: this.editForm.images[0] || undefined,
      images: this.editForm.images.length > 0 ? [...this.editForm.images] : undefined
    });
    this.isEditModalOpen.set(false);
  }

  deleteProduct(product: Product) {
    if (confirm(`Archive product "${product.name}" (${product.sku}) from catalog?`)) {
      this.state.deleteProduct(product.id);
    }
  }

  exportCatalogToExcel(): void {
    const list = this.filteredProducts();
    if (list.length === 0) {
      this.toast.error('No products found to export.');
      return;
    }

    const data = list.map(p => ({
      'SKU': p.sku,
      'Product Name (English)': p.name,
      'Product Name (Amharic)': p.amharicName || '—',
      'Category': p.categoryLabel || p.category,
      'Pricing Model': p.pricingType,
      'Selling Price (ETB)': p.unitPrice,
      'Base Cost (ETB)': p.baseCost || 0,
      'Unit of Measure': p.unit,
      'Availability': p.availability,
      'Reorder Threshold': p.reorderThreshold,
      'Min Order Qty': p.minOrderQty,
      'Published on Web': p.isPublished ? 'Published' : 'Draft',
      'Description': p.description || ''
    }));

    this.excelService.exportJsonToExcel(data, 'Aser_Product_Catalog', 'Products');
    this.toast.success(`Exported ${data.length} products to Excel.`);
  }
}
