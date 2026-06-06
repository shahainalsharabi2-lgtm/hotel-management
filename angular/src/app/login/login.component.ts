import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { HotelAuthService } from '../services/hotel-auth.service';
import { HotelBrandingStoreService } from '../services/hotel-branding-store.service';
import { HotelSystemSettingsLoader } from '../services/hotel-system-settings.loader';
import { UiTranslationsService } from '../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(HotelAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly hotelSettings = inject(HotelSystemSettingsLoader);
  readonly branding = inject(HotelBrandingStoreService);
  readonly ui = inject(UiTranslationsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  userName = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.ui.fetchFromBackend();
    this.hotelSettings.load().subscribe({
      next: () => this.cdr.markForCheck(),
      error: () => this.cdr.markForCheck(),
    });
  }

  get hotelImageSrc(): string | null {
    const url = this.branding.hotelImageDataUrl?.trim();
    return url && url.startsWith('data:image/') ? url : null;
  }

  get hotelDisplayName(): string {
    return this.branding.displayName() || this.ui.screenText('login', 'defaultHotelName');
  }

  get hotelNameInitial(): string {
    const n = this.hotelDisplayName.trim();
    return n ? n.charAt(0) : 'ف';
  }

  togglePasswordVisible(): void {
    this.showPassword = !this.showPassword;
  }

  private resolveLoginError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return this.ui.screenText('login', 'errorNetwork');
      }
      const body = err.error as { message?: string; error?: { message?: string } } | null;
      const serverMsg = body?.error?.message?.trim() || body?.message?.trim();
      if (serverMsg) {
        return serverMsg;
      }
      if (err.status >= 500) {
        return this.ui.screenText('login', 'errorServer');
      }
    }
    return this.ui.screenText('login', 'errorNetwork');
  }

  submit(): void {
    if (this.loading) {
      return;
    }
    const user = this.userName.trim();
    const pass = this.password;
    if (!user || !pass) {
      this.errorMessage = this.ui.screenText('login', 'errorRequired');
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.auth.login(user, pass).subscribe({
      next: (result) => {
        this.loading = false;
        if (result.success) {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')?.trim() ?? '';
          if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
            void this.router.navigateByUrl(returnUrl);
          } else {
            void this.router.navigate(['/dashboard']);
          }
          return;
        }
        this.errorMessage =
          result.message?.trim() || this.ui.screenText('login', 'errorInvalid');
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.loading = false;
        this.errorMessage = this.resolveLoginError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
