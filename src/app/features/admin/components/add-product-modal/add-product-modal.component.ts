import { Component, EventEmitter, Output, inject } from '@angular/core';
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

  // Slide Images for Storefront
  uploadedImages: string[] = [];
  imageUrlInput = '';

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        this.catalogApi.uploadMedia(file).subscribe({
          next: (res) => {
            if (res.success && res.data?.url) {
              this.uploadedImages.push(res.data.url);
            }
          },
          error: (err) => {
            console.error('Failed to upload image to backend:', err);
            const reader = new FileReader();
            reader.onload = (e: any) => {
              const res = e.target.result as string;
              if (res) {
                this.uploadedImages.push(res);
              }
            };
            reader.readAsDataURL(file);
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

  get isValid(): boolean {
    return !!(this.sku.trim() && this.name.trim() && this.description.trim());
  }

  submitProduct() {
    if (!this.isValid) return;

    const categoryLabels: Record<ProductCategory, string> = {
      'PRINTING_SERVICES': 'Printing Press Services',
      'BRANDING_PROMOTION': 'Branding & Promotion',
      'GARMENT_MATERIALS': 'Garment Materials',
      'PRINTING_SUPPLIES': 'Printing Supplies',
      'EQUIPMENT': 'Equipment Distribution'
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
      imageUrl: this.uploadedImages[0] || undefined,
      images: this.uploadedImages.length > 0 ? [...this.uploadedImages] : undefined,
      specifications: {
        'Standard Unit': this.unit,
        'Base Cost': `ETB ${this.baseCost}`
      },
      eligibleBranches: ['BR-01', 'BR-02', 'BR-03']
    });

    this.close.emit();
  }
}
