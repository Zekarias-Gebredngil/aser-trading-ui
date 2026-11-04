import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './core/components/toast/toast-container.component';

@Component({
  selector: 'aser-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <router-outlet />
    <aser-toast-container />
  `
})
export class AppComponent {}
