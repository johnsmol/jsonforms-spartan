import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Text controls and rules · jsonforms-spartan demo',
    loadComponent: () => import('./pages/basic/basic-page').then((m) => m.BasicPage),
  },
  {
    path: 'numbers',
    title: 'Number controls and read-only · jsonforms-spartan demo',
    loadComponent: () => import('./pages/numbers/numbers-page').then((m) => m.NumbersPage),
  },
  { path: '**', redirectTo: '' },
];
