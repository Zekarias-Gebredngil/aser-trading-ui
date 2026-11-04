import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  icon: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(toast: Omit<ToastMessage, 'id'>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 4500
    };

    this.toasts.set([...this.toasts(), newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.duration);
    }
  }

  success(title: string, message = '') {
    this.show({
      title,
      message,
      type: 'success',
      icon: 'lucide:check-circle'
    });
  }

  info(title: string, message = '') {
    this.show({
      title,
      message,
      type: 'info',
      icon: 'lucide:info'
    });
  }

  warning(title: string, message = '') {
    this.show({
      title,
      message,
      type: 'warning',
      icon: 'lucide:alert-triangle'
    });
  }

  error(title: string, message = '') {
    this.show({
      title,
      message,
      type: 'error',
      icon: 'lucide:alert-circle'
    });
  }

  dismiss(id: string) {
    this.toasts.set(this.toasts().filter(t => t.id !== id));
  }
}

