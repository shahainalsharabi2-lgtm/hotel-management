import { Injectable, signal } from '@angular/core';

export type UiMessageTone = 'info' | 'success' | 'error' | 'warning';

export interface UiToastMessage {
  id: string;
  message: string;
  tone: UiMessageTone;
}

export interface UiConfirmRequest {
  message: string;
  resolve: (confirmed: boolean) => void;
}

const TOAST_MS: Record<UiMessageTone, number> = {
  info: 5000,
  success: 4500,
  error: 7000,
  warning: 6000,
};

@Injectable({ providedIn: 'root' })
export class UiMessageService {
  private readonly toastsSignal = signal<UiToastMessage[]>([]);
  private readonly confirmSignal = signal<UiConfirmRequest | null>(null);
  private toastSeq = 0;

  readonly toasts = this.toastsSignal.asReadonly();
  readonly confirmRequest = this.confirmSignal.asReadonly();

  show(message: string, tone: UiMessageTone = 'info'): void {
    const text = String(message ?? '').trim();
    if (!text) {
      return;
    }
    const id = `toast-${++this.toastSeq}-${Date.now()}`;
    this.toastsSignal.update((list) => [...list, { id, message: text, tone }]);
    window.setTimeout(() => this.dismissToast(id), TOAST_MS[tone]);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismissToast(id: string): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }

  confirm(message: string): Promise<boolean> {
    const text = String(message ?? '').trim();
    if (!text) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      this.confirmSignal.set({ message: text, resolve });
    });
  }

  resolveConfirm(confirmed: boolean): void {
    const req = this.confirmSignal();
    if (!req) {
      return;
    }
    this.confirmSignal.set(null);
    req.resolve(confirmed);
  }
}
