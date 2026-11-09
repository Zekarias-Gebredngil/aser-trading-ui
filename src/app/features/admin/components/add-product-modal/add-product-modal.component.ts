import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { ProductCategory, UnitOfMeasure, PricingType } from '../../../../core/models/product.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './add-product-modal.component.html',
  styleUrl: './add-product-modal.component.css'
})
export class AddProductModalComponent {
  readonly state = inject(AserStateService);
  private readonly catalogApi = inject(CatalogApiService);
  @Output() close = new EventEmitter<void>();

  sku = '';
  name = '';
  amharicName = '';
  category: ProductCategory = 'PRINTING_SUPPLIES';
  unit: UnitOfMeasure = 'piece';
  pricingType: PricingType = 'FIXED';
  unitPrice = 0;
  baseCost = 0;
  reorderThreshold = 10;
  description = '';
  isPublished = true;

  // Slide Images for Storefront (Cloud URLs stored in database)
  uploadedImages: string[] = [];
  imageUrlInput = '';
  isUploading = signal<boolean>(false);

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.isUploading.set(true);
      let pending = files.length;

      files.forEach(file => {
        this.catalogApi.uploadMedia(file, 'products').subscribe({
          next: (res) => {
            if (res.success && res.data?.url) {
              this.uploadedImages.push(res.data.url);
            }
            pending--;
            if (pending <= 0) this.isUploading.set(false);
          },
          error: (err) => {
            console.error('Failed to upload image to cloud storage:', err);
            pending--;
            if (pending <= 0) this.isUploading.set(false);
          }
        });
      });
      input.value = '';
    }
  }

  addImageUrl() {
    const url = this.imageUrlInput.trim();
    if (url) {
      this.uploadedImages.push(url);
      this.imageUrlInput = '';
    }
  }

  removeImage(index: number) {
    if (index >= 0 && index < this.uploadedImages.length) {
      this.uploadedImages.splice(index, 1);
    }
  }

  submitted = false;

  get skuError(): string | null {
    if (this.submitted && !this.sku.trim()) return 'SKU code is required.';
    return null;
  }

  get nameError(): string | null {
    if (this.submitted && !this.name.trim()) return 'Product name is required.';
    return null;
  }

  get priceError(): string | null {
    if (this.submitted && this.pricingType !== 'QUOTATION' && (!this.unitPrice || this.unitPrice <= 0)) {
      return 'Unit price must be greater than 0 ETB.';
    }
    return null;
  }

  get isFormValid(): boolean {
    return !!(
      this.sku.trim() &&
      this.name.trim() &&
      (this.pricingType === 'QUOTATION' || this.unitPrice > 0)
    );
  }

  get isValid(): boolean {
    return this.isFormValid && !this.isUploading();
  }

  submitProduct() {
    this.submitted = true;
    if (!this.isFormValid) return;

    const categoryLabels: Record<ProductCategory, string> = {
      'PRINTING_SERVICES': 'Printing Press Services',
      'BRANDING_PROMOTION': 'Branding & Promotion',
      'GARMENT_MATERIALS': 'Garment Materials',
      'PRINTING_SUPPLIES': 'Printing Supplies',
      'EQUIPMENT': 'Equipment Distribution'
    };

    const cleanImages = this.uploadedImages.filter(img => !img.startsWith('data:'));
    const primaryImage = cleanImages[0] || undefined;
    const specData: Record<string, any> = {
      'Standard Unit': this.unit,
      'Base Cost': `ETB ${this.baseCost}`,
      '_galleryImages': cleanImages
    };

    this.state.addProduct({
      sku: this.sku.trim().toUpperCase(),
      name: this.name.trim(),
      amharicName: this.amharicName.trim() || undefined,
      category: this.category,
      categoryLabel: categoryLabels[this.category],
      description: this.description.trim(),
      unit: this.unit,
      pricingType: this.pricingType,
      unitPrice: Number(this.unitPrice),
      baseCost: Number(this.baseCost),
      availability: 'IN_STOCK',
      minOrderQty: 1,
      reorderThreshold: Number(this.reorderThreshold),
      isPublished: this.isPublished,
      featured: false,
      imageUrl: primaryImage,
      images: cleanImages.length > 0 ? cleanImages : undefined,
      specifications: specData,
      eligibleBranches: ['BR-01', 'BR-02', 'BR-03']
    });

    this.close.emit();
  }
}
