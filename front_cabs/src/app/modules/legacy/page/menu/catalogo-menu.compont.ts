import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet} from '@angular/router';
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { TabsNavegacion, ConfiguracionTabsNavegation } from '../../../../shared/molecules/tabsNavegacion/tabsNavegacion.component';

@Component({
  selector: 'app-catalogo-menu',
  standalone: true,
  imports: [RouterOutlet, UiHeaderComponent, TabsNavegacion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-8 w-full">
      <!-- header -->
      <app-ui-header
        titulo="Catálogos Base"
        [visualizarButton]="false"
      ></app-ui-header>
      <!-- TabsNavegacion  + Contendio -->
      <div class=" flex flex-col gap-4 bg-white p-4 rounded-2xl border border-zinc-200">
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
export class CatalogoMenuComponent {

  // Configuracion de las rutas del tabs
  tabsConfig: ConfiguracionTabsNavegation[] = [
      {
          id: 'monedas',
          nombreTab: 'Monedas',
          ruta: './monedas',
          habilitado: true,
      },
      {
          id: 'agentes',
          nombreTab: 'Agentes',
          ruta: './agentes',
          habilitado: true,
      },
      {
          id: 'productos',
          nombreTab: 'Productos',
          ruta: './productos',
          habilitado: true,
      },
      {
          id: 'clientes',
          nombreTab: 'Clientes',
          ruta: './clientes',
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
