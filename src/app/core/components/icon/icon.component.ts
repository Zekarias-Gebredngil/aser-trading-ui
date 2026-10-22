import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import 'iconify-icon';
import './icon-bundle';

@Component({
  selector: 'aser-icon',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css'
})
export class IconComponent {
  @Input() name = 'lucide:box';
  @Input() size: number | string = 18;
  @Input() color = 'currentColor';
}
