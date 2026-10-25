import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-cart-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent, TranslatePipe],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.css'
})
export class CartDrawerComponent {
  readonly state = inject(AserStateService);
  @Output() close = new EventEmitter<void>();
  @Output() checkout = new EventEmitter<void>();
}
