import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { TabsNavegacion, ConfiguracionTabsNavegation } from '../../../../shared/molecules/tabsNavegacion/tabsNavegacion.component';


@Component({
    selector: 'app-metricas-menu',
    standalone: true,
    imports: [CommonModule, RouterOutlet, UiHeaderComponent, TabsNavegacion],
    template: `
        <div class="min-h-screen flex flex-col gap-8">
            <app-ui-header
                titulo="Estadísticas de Cotizaciones"
                descripcion="Análisis y métricas detalladas del sistema de cotizaciones"
                [visualizarButton]="false"
            ></app-ui-header>
            <!-- TabsNavegacion  + Contendio -->
            <div class=" flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-200">
                <!-- Tabs -->
                <app-tab
                    [fondoBlanco]="true"
                    [tabs]="tabsConfig"
                    [tabActivaId]="tabActivaId"
                    (buttonClick)="onButtonAction()"
                    (tabSeleccionada)="onTabChange($event)">
                </app-tab>
                <!-- Contendio dinamico  -->
                <div class=" fade-in">
                    <router-outlet />
                </div>
            </div>
        </div>
    `,
})
export class MetricasMenuComponent {

  // Configuracion de las rutas del tabs
    tabsConfig: ConfiguracionTabsNavegation[] = [
        {
            id: 'general',
            nombreTab: 'General',
            ruta: './general',
            habilitado: true,
        },
        {
            id: 'top-clientes',
            nombreTab: 'Top clientes',
            ruta: './top-clientes',
            habilitado: true,
        },
        {
            id: 'rendimiento-agente',
            nombreTab: 'Rendimiento de agente',
            ruta: './rendimiento-agentes',
            habilitado: true,
        },
        {
            id: 'producto',
            nombreTab: 'Productos',
            ruta: './productos',
            habilitado: true,
        },
        {
            id: 'rango-monto',
            nombreTab: 'Rango de monto',
            ruta: './rangos-monto',
            habilitado: true,
        },
        {
            id: 'proximo-vencer',
            nombreTab: 'Proximo a vencer',
            ruta: './proximas-vencer',
            habilitado: true,
        },
    ];

    tabActivaId: string = 'general';

    onTabChange(tabId: string): void {
        console.log('Tab seleccionada:', tabId);
        // Navegación o cambio de contenido
    }

    onButtonAction(): void {
        console.log('Botón clickeado');
        // Acción del botón
    }
}
