import { Injectable, signal } from '@angular/core';

export type UiMessageTone = 'info' | 'success' | 'error' | 'warning';

export interface UiToastOptions {
  title?: string;
  durationMs?: number;
}

export interface UiToastMessage {
  id: string;
  message: string;
  title?: string;
  tone: UiMessageTone;
  durationMs: number;
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

const MAX_TOASTS = 4;

@Injectable({ providedIn: 'root' })
export class UiMessageService {
  private readonly toastsSignal = signal<UiToastMessage[]>([]);
  private readonly confirmSignal = signal<UiConfirmRequest | null>(null);
  private toastSeq = 0;
  private readonly dismissTimers = new Map<string, number>();

  readonly toasts = this.toastsSignal.asReadonly();
  readonly confirmRequest = this.confirmSignal.asReadonly();

  show(message: string, tone: UiMessageTone = 'info', options?: UiToastOptions): void {
    const text = String(message ?? '').trim();
    if (!text) {
      return;
    }
    const durationMs = options?.durationMs ?? TOAST_MS[tone];
    const title = options?.title?.trim() || undefined;
    const id = `toast-${++this.toastSeq}-${Date.now()}`;
    const toast: UiToastMessage = { id, message: text, title, tone, durationMs };
    this.toastsSignal.update((list) => {
      const next = [...list, toast];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
    const timerId = window.setTimeout(() => this.dismissToast(id), durationMs);
    this.dismissTimers.set(id, timerId);
  }

  success(message: string, options?: UiToastOptions): void {
    this.show(message, 'success', options);
  }

  error(message: string, options?: UiToastOptions): void {
    this.show(message, 'error', options);
  }

  warning(message: string, options?: UiToastOptions): void {
    this.show(message, 'warning', options);
  }

  info(message: string, options?: UiToastOptions): void {
    this.show(message, 'info', options);
  }

  dismissToast(id: string): void {
    const timerId = this.dismissTimers.get(id);
    if (timerId != null) {
      window.clearTimeout(timerId);
      this.dismissTimers.delete(id);
    }
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
