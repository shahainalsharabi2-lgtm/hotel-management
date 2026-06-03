import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HotelAppUserSession {
  id: number;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string;
}

export interface HotelLoginResult {
  success: boolean;
  message?: string;
  user?: HotelAppUserSession;
}

const SESSION_STORAGE_KEY = 'hotelAppUserSession';

@Injectable({ providedIn: 'root' })
export class HotelAuthService {
  private readonly http = inject(HttpClient);
  private session: HotelAppUserSession | null = null;

  constructor() {
    this.restoreSession();
  }

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/hotel-auth/login`;
  }

  isLoggedIn(): boolean {
    return this.session != null;
  }

  currentUser(): HotelAppUserSession | null {
    return this.session;
  }

  login(userName: string, password: string): Observable<HotelLoginResult> {
    return this.http
      .post<HotelLoginResult>(this.apiUrl, {
        userName: userName.trim(),
        password,
      })
      .pipe(
        tap((result) => {
          if (result.success && result.user) {
            this.persistSession(result.user);
          }
        }),
      );
  }

  logout(): void {
    this.session = null;
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private persistSession(user: HotelAppUserSession): void {
    this.session = user;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }

  private restoreSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as HotelAppUserSession;
      if (parsed?.id && parsed?.userName) {
        this.session = parsed;
      }
    } catch {
      this.session = null;
    }
  }
}
