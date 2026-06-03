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
import { HotelDatabaseAdminService } from '../../services/hotel-database-admin.service';
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
      error: () => {
        this.backupLoading = false;
        this.statusMessage = this.ui.chromeLabel('dbOpFailed');
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
      error: () => {
        this.updateLoading = false;
        this.statusMessage = this.ui.chromeLabel('dbOpFailed');
        this.statusError = true;
        this.cdr.markForCheck();
      },
    });
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
