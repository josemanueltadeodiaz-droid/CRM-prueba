import { Routes } from '@angular/router';
import { CatalogoMenuComponent } from './page/menu/catalogo-menu.compont';
import { MetricasMenuComponent } from './page/metricas-documentos/metricas-menu.component';

export const legacyRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    children: [
      // --- MENÚ 1: CATÁLOGOS ---
      {
        path: 'catalogos-base',
        component: CatalogoMenuComponent,
        children: [
          {
            path: 'monedas',
            loadComponent: () =>
              import('./page/monedas/monedas.component').then(
                (m) => m.MonedasComponent,
              ),
          },
          {
            path: 'agentes',
            loadComponent: () =>
              import('./page/agentes/agentes.component').then(
                (m) => m.AgentesComponent,
              ),
          },
          {
            path: 'productos',
            loadComponent: () =>
              import('./page/productos/productos.component').then(
                (m) => m.ProductosComponent,
              ),
          },
          {
            path: 'clientes',
            loadComponent: () =>
              import('./page/clientes-legacy/clientes-legacy.component').then(
                (m) => m.ClientesLegacyComponent,
              ),
          },
          // Redirección interna de Catálogos
          { path: '', redirectTo: 'monedas', pathMatch: 'full' },
        ],
      },

      // --- MENÚ 2: OPERACIONES ---
      {
        path: 'operaciones',
        children: [
          {
            path: 'documentos',
            loadComponent: () =>
              import('./page/documentos/documentos.component').then(
                (m) => m.DocumentosComponent,
              ),
          },
          {
            path: 'documentos/crear',
            loadComponent: () =>
              import('./page/documentos/documento-create/documento-create.component').then(
                (m) => m.DocumentoCreateComponent,
              ),
          },
          {
            path: 'documentos/editar/:id',
            loadComponent: () =>
              import('./page/documentos/documento-create/documento-create.component').then(
                (m) => m.DocumentoCreateComponent,
              ),
          },
          // Redirección interna de Operaciones
          { path: '', redirectTo: 'documentos', pathMatch: 'full' },
        ],
      },

      // --- MENÚ 3: MÉTRICAS (RUTA INDEPENDIENTE) ---
      {
        path: 'metricas',
        component: MetricasMenuComponent,
        children: [
          {
            path: 'general',
            loadComponent: () =>
              import('./page/metricas-documentos/metricas-general/metricas-general.component').then(
                (m) => m.MetricasGeneralComponent,
              ),
          },
          {
            path: 'top-clientes',
            loadComponent: () =>
              import('./page/metricas-documentos/top-clientes/top-clientes.component').then(
                (m) => m.TopClientesComponent,
              ),
          },
          {
            path: 'rendimiento-agentes',
            loadComponent: () =>
              import('./page/metricas-documentos/rendimiento-agentes/rendimiento-agentes.component').then(
                (m) => m.RendimientoAgentesComponent,
              ),
          },
          {
            path: 'productos',
            loadComponent: () =>
              import('./page/metricas-documentos/metricas-productos/metricas-productos.component').then(
                (m) => m.MetricasProductosComponent,
              ),
          },
          {
            path: 'rangos-monto',
            loadComponent: () =>
              import('./page/metricas-documentos/rangos-monto/rangos-monto.component').then(
                (m) => m.RangosMontoComponent,
              ),
          },
          {
            path: 'proximas-vencer',
            loadComponent: () =>
              import('./page/metricas-documentos/metricas-cotizaciones/metricas-cotizaciones.component').then(
                (m) => m.MetricasCotizacionesComponent,
              ),
          },
          // Redirección interna de Métricas
          { path: '', redirectTo: 'general', pathMatch: 'full' },
        ],
      },

      // Redirección global del módulo
      {
        path: '',
        redirectTo: 'catalogos-base',
        pathMatch: 'full',
      },
    ],
  },
];
