import { Routes } from '@angular/router';

export const administracionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../../layout/dashboard-layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      {
        path: 'resumen',  // Mover esta ruta PRIMERO
        loadComponent: () => import('./pages/resumen/resumen.component').then(m => m.ResumenComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
      },
      {
        path: 'enlace-agentes',
        loadComponent: () => import('./pages/enlace-agentes/enlace-agentes.component').then(m => m.EnlaceAgentesComponent)
      },
      {
        path: '',  // Ruta por defecto al final
        loadComponent: () => import('./pages/resumen/resumen.component').then(m => m.ResumenComponent)
      }
    ]
  }
];