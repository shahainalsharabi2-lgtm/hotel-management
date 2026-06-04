import { Component, inject } from '@angular/core';
import { AppLoadingService } from '../../services/app-loading.service';
import { UiTranslationsService } from '../../services/ui-translations.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  templateUrl: './app-loading-overlay.component.html',
  styleUrls: ['./app-loading-overlay.component.css'],
})
export class AppLoadingOverlayComponent {
  readonly loading = inject(AppLoadingService);
  readonly ui = inject(UiTranslationsService);

  onRefresh(): void {
    this.loading.refreshPage();
  }
}
