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

  normalizeUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('https://') || (url.startsWith('http://') && !url.includes('localhost:') && !url.includes('127.0.0.1:'))) {
      return url;
    }
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const port = url.split(':')[2]?.split('/')[0] || '8085';
        const path = url.split(`:${port}`)[1] || '';
        return `${window.location.protocol}//${window.location.hostname}:${port}${path}`;
      }
      return url;
    }
    if (url.startsWith('/uploads/')) {
      const origin = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:8085`
        : 'http://localhost:8085';
      return `${origin}${url}`;
    }
    return url;
  }

  get currentImage(): string | null {
    const list = this.validImages;
    if (list.length === 0) return null;
    const idx = Math.min(Math.max(0, this.currentIndex()), list.length - 1);
    return this.normalizeUrl(list[idx]);
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

