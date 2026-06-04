import { Injectable, signal } from '@angular/core';

/** بعد هذه المدة يُعرض زر التحديث (Render cold start / شبكة بطيئة) */
const SLOW_LOADING_MS = 1_800;

@Injectable({ providedIn: 'root' })
export class AppLoadingService {
  private pending = 0;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;

  /** طلب API قيد التنفيذ */
  readonly active = signal(false);
  /** التحميل تجاوز الحد المعتاد */
  readonly slow = signal(false);

  begin(): void {
    this.pending++;
    if (this.pending === 1) {
      this.active.set(true);
      this.clearSlowTimer();
      this.slowTimer = setTimeout(() => {
        if (this.pending > 0) {
          this.slow.set(true);
        }
      }, SLOW_LOADING_MS);
    }
  }

  end(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      this.active.set(false);
      this.slow.set(false);
      this.clearSlowTimer();
    }
  }

  refreshPage(): void {
    window.location.reload();
  }

  private clearSlowTimer(): void {
    if (this.slowTimer !== null) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
  }
}
