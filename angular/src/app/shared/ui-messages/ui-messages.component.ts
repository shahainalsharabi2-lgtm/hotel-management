import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiMessageService, UiToastMessage } from '../../services/ui-message.service';
import { UiTranslationsService } from '../../services/ui-translations.service';

@Component({
  selector: 'app-ui-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-messages.component.html',
  styleUrls: ['./ui-messages.component.css'],
})
export class UiMessagesComponent {
  readonly uiMsg = inject(UiMessageService);
  readonly ui = inject(UiTranslationsService);

  toastIcon(tone: UiToastMessage['tone']): string {
    switch (tone) {
      case 'success':
        return 'fa-check-circle';
      case 'error':
        return 'fa-exclamation-circle';
      case 'warning':
        return 'fa-exclamation-triangle';
      default:
        return 'fa-info-circle';
    }
  }

  onConfirm(confirmed: boolean): void {
    this.uiMsg.resolveConfirm(confirmed);
  }
}
