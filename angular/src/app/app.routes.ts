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

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'booking', component: BookingFormComponent },
  { path: 'bookings', component: BookingListComponent },
  { path: 'front-desk', component: BookingListComponent },
  { path: 'rooms', component: RoomsComponent },
  { path: 'rooms/add', component: RoomFormComponent },
  { path: 'rooms/edit/:id', component: RoomFormComponent },
  { path: 'rooms/details/:id', component: RoomDetailsComponent },
  { path: 'database', component: DatabaseComponent },
  { path: 'reports', component: ReportsComponent },
  { path: 'settings', component: SettingsComponent },
];
