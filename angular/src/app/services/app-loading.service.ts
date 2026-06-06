import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppLoadingService {
  private pending = 0;

  /** طلب API قيد التنفيذ */
  readonly active = signal(false);

  begin(): void {
    this.pending++;
    if (this.pending === 1) {
      this.active.set(true);
    }
  }

  end(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      this.active.set(false);
    }
  }
}
