import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HotelAppUserDto, HotelAppUserService } from '../services/hotel-app-user.service';
import { HotelAuthService } from '../services/hotel-auth.service';
import { UiMessageService } from '../services/ui-message.service';
import { UiTranslationsService } from '../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.css', '../settings/settings-base.css'],
})
export class MyAccountComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  private readonly auth = inject(HotelAuthService);
  private readonly userService = inject(HotelAppUserService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  saving = false;
  profile: HotelAppUserDto | null = null;

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    const session = this.auth.currentUser();
    if (!session?.id) {
      void this.router.navigate(['/login']);
      return;
    }
    this.userService.get(session.id).subscribe({
      next: (user) => {
        this.profile = { ...user };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.uiMsg.show(this.ui.screenText('myAccount', 'loadFail'));
        this.cdr.markForCheck();
      },
    });
  }

  save(): void {
    if (!this.profile?.id || this.saving) {
      return;
    }
    const input = {
      firstName: (this.profile.firstName ?? '').trim(),
      lastName: (this.profile.lastName ?? '').trim(),
      userName: (this.profile.userName ?? '').trim(),
      email: (this.profile.email ?? '').trim(),
      phoneNumber: (this.profile.phoneNumber ?? '').trim(),
      password: (this.profile.password ?? '').trim(),
    };
    if (!input.firstName || !input.lastName || !input.userName) {
      this.uiMsg.show(this.ui.screenText('myAccount', 'requiredFields'));
      return;
    }
    this.saving = true;
    this.userService.getAll().subscribe({
      next: (all) => {
        const duplicate = all.some(
          (u) => u.id !== this.profile!.id && u.userName.toLowerCase() === input.userName.toLowerCase(),
        );
        if (duplicate) {
          this.saving = false;
          this.uiMsg.show(this.ui.screenText('myAccount', 'duplicateUserName'));
          this.cdr.markForCheck();
          return;
        }
        this.userService.update(this.profile!.id, input).subscribe({
          next: () => {
            this.saving = false;
            this.auth.updateSession({
              id: this.profile!.id,
              firstName: input.firstName,
              lastName: input.lastName,
              userName: input.userName,
              email: input.email,
              phoneNumber: input.phoneNumber,
            });
            this.uiMsg.show(this.ui.screenText('myAccount', 'saveSuccess'));
            this.cdr.markForCheck();
          },
          error: () => {
            this.saving = false;
            this.uiMsg.show(this.ui.screenText('myAccount', 'saveFail'));
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.saving = false;
        this.uiMsg.show(this.ui.screenText('myAccount', 'saveFail'));
        this.cdr.markForCheck();
      },
    });
  }
}
