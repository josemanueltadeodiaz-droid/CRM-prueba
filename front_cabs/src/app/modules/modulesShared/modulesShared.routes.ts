import { Routes } from '@angular/router';

export const modulesSharedRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    children: [
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then(
            (m) => m.UsuariosComponent,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('../modulesShared/pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
      },  
      {
        path: 'ayuda',
        loadComponent: () => import('./pages/ayuda/ayuda.component').then(m => m.CentroAyudaComponent)
      }, 
      {
        path: 'calendario',
        loadComponent: () => import('./pages/calendario/calendario.component').then(m => m.CalendarioComponent)
      }              
    ]
  }
];
