import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { ReceiveStockModalComponent } from '../../components/receive-stock-modal/receive-stock-modal.component';
import { NewTransferModalComponent } from '../../components/new-transfer-modal/new-transfer-modal.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    AdminShellComponent,
    ReceiveStockModalComponent,
    NewTransferModalComponent,
    TranslatePipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly state = inject(AserStateService);
  isReceiveModalOpen = signal(false);
  isTransferModalOpen = signal(false);

  get greetingKey(): string {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) {
      return 'DASHBOARD.GOOD_AFTERNOON';
    } else if (hour >= 18 || hour < 5) {
      return 'DASHBOARD.GOOD_EVENING';
    } else {
      return 'DASHBOARD.GOOD_MORNING';
    }
  }

  get greetingDefault(): string {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) {
      return 'Good afternoon';
    } else if (hour >= 18 || hour < 5) {
      return 'Good evening';
    } else {
      return 'Good morning';
    }
  }

  getBranchName(id: string): string {
    return this.state.branches().find(b => b.id === id)?.name || id;
  }
}
