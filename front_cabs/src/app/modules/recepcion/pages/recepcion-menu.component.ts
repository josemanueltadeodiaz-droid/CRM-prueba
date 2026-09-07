import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TabsNavegacion, ConfiguracionTabsNavegation } from '../../../shared/molecules/tabsNavegacion/tabsNavegacion.component';
import { UiHeaderComponent } from '../../../shared/molecules/header/header.component';

@Component({
  selector: 'app-recepcion-menu',
  standalone: true,
  imports: [CommonModule, RouterOutlet, UiHeaderComponent, TabsNavegacion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-8 w-full">
      <!-- header -->
      <app-ui-header
        titulo="Ordenes de servicio"
        descripcion="Gestión de órdenes de servicio y equipo de trabajo"
        [visualizarButton]="false"
      ></app-ui-header>
      
      <!-- TabsNavegacion + Contenido -->
      <div class="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-zinc-200">
        <!-- Tabs -->
        <app-tab
          [fondoBlanco]="true"
          [tabs]="tabsConfig"
          [tabActivaId]="tabActivaId"
          (buttonClick)="onButtonAction()"
          (tabSeleccionada)="onTabChange($event)">
        </app-tab>
        
        <!-- Contenido dinámico -->
        <div class="fade-in">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Animación suave de entrada */
    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class RecepcionMenuComponent {
  // Configuración de las rutas del tabs
  tabsConfig: ConfiguracionTabsNavegation[] = [
    {
      id: 'ordenes-trabajo',
      nombreTab: 'Órdenes de trabajo',
      ruta: './ordenes-trabajo',
      habilitado: true,
    },
    {
      id: 'equipo-trabajo',
      nombreTab: 'Equipo de trabajo',
      ruta: './equipo-trabajo',
      habilitado: true,
    },
  ];

  tabActivaId: string = 'ordenes-trabajo';

  onTabChange(tabId: string): void {
    console.log('Tab seleccionada:', tabId);
    // Navegación o cambio de contenido
  }

  onButtonAction(): void {
    console.log('Botón clickeado');
    // Acción del botón
  }
}