import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lead-capture/lead-capture').then(m => m.LeadCapture)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
