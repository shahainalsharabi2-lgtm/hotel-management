import { Routes } from '@angular/router';
import { BookingFormComponent } from './booking-form/booking-form.component';
import { BookingListComponent } from './booking-list/booking-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DatabaseComponent } from './database/database.component';
import { RoomsComponent } from './rooms/rooms.component';
import { RoomFormComponent } from './rooms/room-form/room-form';
import { RoomDetailsComponent } from './rooms/room-details/room-details';
import { SettingsComponent } from './settings/settings.component';
import { ReportsComponent } from './reports/reports.component';
import { LoginComponent } from './login/login.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { authGuard, loginPageGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent, canActivate: [loginPageGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'booking', component: BookingFormComponent, canActivate: [authGuard] },
  { path: 'bookings', component: BookingListComponent, canActivate: [authGuard] },
  { path: 'front-desk', component: BookingListComponent, canActivate: [authGuard] },
  { path: 'rooms', component: RoomsComponent, canActivate: [authGuard] },
  { path: 'rooms/add', component: RoomFormComponent, canActivate: [authGuard] },
  { path: 'rooms/edit/:id', component: RoomFormComponent, canActivate: [authGuard] },
  { path: 'rooms/details/:id', component: RoomDetailsComponent, canActivate: [authGuard] },
  { path: 'database', component: DatabaseComponent, canActivate: [authGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'my-account', component: MyAccountComponent, canActivate: [authGuard] },
];
