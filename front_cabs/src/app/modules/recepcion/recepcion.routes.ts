import { Routes } from '@angular/router';

export const recepcionRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    children: [
      {
        path: 'menuOrden',
        loadComponent: () =>
          import('./pages/recepcion-menu.component').then(
            (m) => m.RecepcionMenuComponent,
          ),
        children: [
          {
            path: 'ordenes-trabajo',
            loadComponent: () =>
              import('./pages/misOrdenesServicio/misOrdenesServicio.component').then(
                (m) => m.MisAsignacionesComponent,
              ),
          },
          {
            path: 'equipo-trabajo',
            loadComponent: () =>
              import('./pages/equipo-soporte/equipo-soporte.component').then(
                (m) => m.EquipoSoporteComponent,
              ),
          },
          {
            path: '',
            redirectTo: 'ordenes-trabajo',
            pathMatch: 'full',
          },
        ],
      },
    ],
  },
];