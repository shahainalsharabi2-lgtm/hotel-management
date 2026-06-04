import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotelAuthService } from '../../services/hotel-auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { HotelDatabaseAdminService } from '../../services/hotel-database-admin.service';
import { Router } from '@angular/router';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';

@Component({
  selector: 'app-db-settings-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './db-settings-panel.component.html',
  styleUrls: ['./db-settings-panel.component.css'],
})
export class DbSettingsPanelComponent {
  readonly ui = inject(UiTranslationsService);
  private readonly auth = inject(HotelAuthService);
  private readonly router = inject(Router);
  private readonly dbAdmin = inject(HotelDatabaseAdminService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @Input() open = false;
  @Input() userLabel = '';
  @Input() userInitial = 'م';

  @Output() closed = new EventEmitter<void>();

  backupLoading = false;
  updateLoading = false;
  statusMessage = '';
  statusError = false;

  constructor() {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open) {
      this.requestClose();
    }
  }

  requestClose(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    this.requestClose();
  }

  onPanelClick(event: Event): void {
    event.stopPropagation();
  }

  createBackup(): void {
    if (this.backupLoading || this.updateLoading) {
      return;
    }
    this.backupLoading = true;
    this.statusMessage = '';
    this.statusError = false;
    this.dbAdmin.createBackup().subscribe({
      next: (result) => {
        this.backupLoading = false;
        if (result.success && result.jsonContent) {
          this.downloadJson(result.fileName || 'hotel-backup.json', result.jsonContent);
          this.statusMessage = result.message || this.ui.chromeLabel('dbBackupSuccess');
          this.statusError = false;
        } else {
          this.statusMessage = result.message || this.ui.chromeLabel('dbOpFailed');
          this.statusError = true;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.backupLoading = false;
        this.statusMessage = this.resolveOpError(err);
        this.statusError = true;
        this.cdr.markForCheck();
      },
    });
  }

  updateDatabase(): void {
    if (this.backupLoading || this.updateLoading) {
      return;
    }
    this.updateLoading = true;
    this.statusMessage = '';
    this.statusError = false;
    this.dbAdmin.updateDatabase().subscribe({
      next: (result) => {
        this.updateLoading = false;
        this.statusMessage = result.message || (result.success ? this.ui.chromeLabel('dbUpdateSuccess') : this.ui.chromeLabel('dbOpFailed'));
        this.statusError = !result.success;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.updateLoading = false;
        this.statusMessage = this.resolveOpError(err);
        this.statusError = true;
        this.cdr.markForCheck();
      },
    });
  }

  openMyAccount(): void {
    this.requestClose();
    void this.router.navigate(['/my-account']);
  }

  logout(): void {
    this.auth.logout();
    this.requestClose();
    void this.router.navigate(['/login']);
  }

  private resolveOpError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; error?: { message?: string } } | string | null;
      if (typeof body === 'string' && body.trim()) {
        if (body.trimStart().startsWith('<')) {
          return 'الخادم أعاد صفحة HTML بدل JSON. جرّب إعادة تحميل الصفحة أو انتظر اكتمال إقلاع الخادم.';
        }
        return body;
      }
      if (body && typeof body === 'object') {
        const msg = body.message ?? body.error?.message;
        if (msg) {
          return msg;
        }
      }
      if (err.status === 404) {
        return 'المسار غير موجود على الخادم. تأكد من نشر آخر إصدار للـ API.';
      }
      if (err.status === 405) {
        return 'طريقة الطلب غير مدعومة على الخادم. حدّث الواجهة من الموقع.';
      }
    }
    if (err instanceof SyntaxError || (err instanceof Error && err.message.includes('JSON'))) {
      return 'استجابة غير صالحة من الخادم. جرّب مرة أخرى بعد دقيقة.';
    }
    return this.ui.chromeLabel('dbOpFailed');
  }

  private downloadJson(fileName: string, json: string): void {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
