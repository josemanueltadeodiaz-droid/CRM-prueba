# TabsNavegacionComponent

Componente de navegación por tabs reutilizable que permite cambiar de vistas mediante rutas (routerLink), controlar tabs habilitados/deshabilitados y emitir eventos cuando un tab es seleccionado.

- Selector
<app-tab></app-tab>

# Dependencias

- CommonModule

- RouterLink

- RouterLinkActive

## Interface de configuración
ConfiguracionTabsNavegation

Define la estructura de cada tab.

export interface ConfiguracionTabsNavegation {
  id: string;
  nombreTab: string;
  ruta: string;
  habilitado: boolean;
}

# Ejemplo básico de uso
Componente padre (.ts)
tabs: ConfiguracionTabsNavegation[] = [
  {
    id: 'general',
    nombreTab: 'General',
    ruta: '/detalle/general',
    habilitado: true
  },
  {
    id: 'configuracion',
    nombreTab: 'Configuración',
    ruta: '/detalle/configuracion',
    habilitado: true
  },
  {
    id: 'historial',
    nombreTab: 'Historial',
    ruta: '/detalle/historial',
    habilitado: false
  }
];

tabActiva = 'general';

onTabChange(id: string) {
  console.log('Tab seleccionada:', id);
}

- Template padre (.html)
<app-tab
  [tabs]="tabs"
  [tabActivaId]="tabActiva"
  [fondoBlanco]="true"
  (tabSeleccionada)="onTabChange($event)">
</app-tab>

- Lógica interna
Selección de tab

Solo permite seleccionar tabs con habilitado = true

Actualiza la tab activa

Emite el evento tabSeleccionada

seleccionarTab(tab: ConfiguracionTabsNavegation): void {
  if (tab.habilitado) {
    this.tabActivaId = tab.id;
    this.tabSeleccionada.emit(tab.id);
  }
}

