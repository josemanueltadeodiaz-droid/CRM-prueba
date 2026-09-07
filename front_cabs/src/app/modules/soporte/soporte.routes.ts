import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../layout/dashboard-layout/dashboard-layout.component';

export const soporteRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    children: [
      {
        path: 'misOrdenesServicio',
        loadComponent: () =>
          import('./pages/misOrdenesServicio/misOrdenesServicio.component').then(
            (m) => m.MisAsignacionesComponent,
          ),
      },    
      {
        path: '',
        redirectTo: 'asignaciones',
        pathMatch: 'full',
      },
    ],
  },
];
