import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { ServiceCategory } from '../../../../core/models/quote.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-public-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, TranslatePipe],
  templateUrl: './public-footer.component.html',
  styleUrl: './public-footer.component.css'
})
export class PublicFooterComponent {
  @Output() requestQuote = new EventEmitter<ServiceCategory>();
}
