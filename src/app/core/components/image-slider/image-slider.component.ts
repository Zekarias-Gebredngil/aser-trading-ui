import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'aser-image-slider',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './image-slider.component.html',
  styleUrl: './image-slider.component.css'
})
export class ImageSliderComponent {
  @Input() images: readonly string[] = [];
  @Input() alt = 'Aser Product / Service Image';
  @Input() height = '200px';
  @Input() fallbackCategory = 'PRINTING_SUPPLIES';
  @Input() rounded = true;
  @Input() objectFit: 'cover' | 'contain' = 'cover';

  currentIndex = signal(0);
  failedImages = signal<Set<string>>(new Set());

  get validImages(): readonly string[] {
    if (!this.images || this.images.length === 0) return [];
    const failed = this.failedImages();
    return this.images.filter(img => !!img && !failed.has(img));
  }

  get currentImage(): string | null {
    const list = this.validImages;
    if (list.length === 0) return null;
    const idx = Math.min(Math.max(0, this.currentIndex()), list.length - 1);
    return list[idx];
  }

  onImageError(imgUrl: string | null) {
    if (!imgUrl) return;
    this.failedImages.update(set => {
      const newSet = new Set(set);
      newSet.add(imgUrl);
      return newSet;
    });
  }

  next(event?: Event) {
    if (event) event.stopPropagation();
    const len = this.validImages.length;
    if (len <= 1) return;
    this.currentIndex.update(i => (i + 1) % len);
  }

  prev(event?: Event) {
    if (event) event.stopPropagation();
    const len = this.validImages.length;
    if (len <= 1) return;
    this.currentIndex.update(i => (i - 1 + len) % len);
  }

  goTo(idx: number, event?: Event) {
    if (event) event.stopPropagation();
    if (idx >= 0 && idx < this.validImages.length) {
      this.currentIndex.set(idx);
    }
  }
}

