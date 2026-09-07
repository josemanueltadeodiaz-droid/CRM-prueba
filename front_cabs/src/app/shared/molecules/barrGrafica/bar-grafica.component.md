# Componente Barra Gráfica

El **UiBarraGraficaComponent** es un componente reutilizable que muestra una gráfica de barras basada en datos mensuales. Está construido con Chart.js y ng2-charts, y permite visualizar información numérica de forma clara, responsiva e interactiva.

## ¿Para qué sirve?

Este componente se utiliza para:

- Mostrar datos mensuales en forma de gráfica de barras
- Visualizar estadísticas, métricas o reportes
- Detectar tendencias de manera visual
- Permitir interacción al dar clic en una barra

## Características

- Gráfica de barras responsiva
- Componente standalone
- Actualización automática al cambiar los datos
- Detección de clic en barras
- Estilos visuales integrados
- Basado en Chart.js

## Estructura de los datos

El componente recibe un arreglo de objetos con la siguiente estructura:

```typescript
interface DatoMensual {
  mes: string;
  valor: number;
}
# Instalación

Importa el componente en el componente donde se usará la gráfica:

import { UiBarraGraficaComponent } from './ruta/ui-barra-grafica/ui-barra-grafica.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [UiBarraGraficaComponent],
})
export class DashboardComponent {}

Uso básico
<app-ui-barra-grafica
  [datos]="datosMensuales">
</app-ui-barra-grafica>

datosMensuales = [
  { mes: 'Enero', valor: 120 },
  { mes: 'Febrero', valor: 90 },
  { mes: 'Marzo', valor: 150 },
];

Detectar clic en una barra

El componente emite el índice de la barra seleccionada:

<app-ui-barra-grafica
  [datos]="datosMensuales"
  (barraClickeada)="onBarraClick($event)">
</app-ui-barra-grafica>

onBarraClick(index: number) {
  console.log('Barra seleccionada:', index);
}

- Inputs disponibles
- Input	Tipo	Descripción
- datos	DatoMensual[]	Datos que se mostrarán en la gráfica
- Outputs disponibles
- Output	Tipo	Descripción
- barraClickeada	number	Emite el índice de la barra clickeada
- Comportamiento interno

