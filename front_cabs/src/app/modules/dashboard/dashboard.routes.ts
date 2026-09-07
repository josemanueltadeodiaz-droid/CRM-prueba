import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../layout/dashboard-layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/landing/landing.component').then(m => m.DashboardComponent)
      },
      // Redirect legacy
      {
        path: 'evaluaciones/registro',
        redirectTo: 'evaluaciones/nueva',
        pathMatch: 'full'
      },
    ]
  }
];

