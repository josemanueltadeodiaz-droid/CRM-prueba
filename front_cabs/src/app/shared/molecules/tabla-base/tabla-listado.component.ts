import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableHeaderCellComponent } from '../../atoms/tabla-base/table-header-cell/table-header-cell.component';
import { TableCellComponent } from '../../atoms/tabla-base/table-cell/table-cell.component';
import { UiBotonComponent } from '../../atoms/boton/boton.component';

export interface ConfiguracionColumna<T = any> {
  encabezado: string;
  campo?: keyof T;
  plantilla?: TemplateRef<any>;
  ancho?: string;
  alineacion?: 'left' | 'center' | 'right';
  esBooleano?: boolean; // Nueva propiedad para campos booleanos
  etiquetasBooleanas?: { // Nueva propiedad para definir etiquetas personalizadas
    true: { texto: string; clase: string };
    false: { texto: string; clase: string };
  };
}

export interface AccionTabla<T = any> {
  etiqueta: string;
  icono?: string;
  clase?: string;
  variante?: string; // Acepta cualquier string de variante
  tamano?: 'xs' | 'sm' | 'md' | 'lg';
  accion: (item: T) => void;
  mostrar?: (item: T) => boolean;
}

@Component({
  selector: 'app-tabla-listado',
  standalone: true,
  imports: [
    CommonModule,
    TableHeaderCellComponent,
    TableCellComponent,
    UiBotonComponent
  ],
  templateUrl: './tabla-listado.component.html',
  styleUrls: ['./tabla-listado.component.css']
})
export class TablaListadoComponent<T = any> {
  @Input() datos: T[] = [];
  @Input() columnas: ConfiguracionColumna<T>[] = [];
  @Input() acciones: AccionTabla<T>[] = [];
  @Input() cargando: boolean = false;
  @Input() mensajeSinDatos: string = 'No se encontraron registros';
  @Input() mensajeCargando: string = 'Cargando datos...';
  @Input() mostrarIndice: boolean = false;
  @Input() clasePersonalizada: string = '';

  @Output() filaClick = new EventEmitter<T>();
  @Output() filaDobleClick = new EventEmitter<T>();

  obtenerValorCelda(item: T, campo: keyof T): any {
    return item[campo];
  }

  alManejarFilaClick(item: T): void {
    this.filaClick.emit(item);
  }

  alManejarFilaDobleClick(item: T): void {
    this.filaDobleClick.emit(item);
  }

  ejecutarAccion(accion: AccionTabla<T>, item: T, evento: Event): void {
    evento.stopPropagation();
    accion.accion(item);
  }

  mostrarAccion(accion: AccionTabla<T>, item: T): boolean {
    return accion.mostrar ? accion.mostrar(item) : true;
  }

  obtenerAlineacion(columna: ConfiguracionColumna<T>): string {
    return columna.alineacion || 'center';
  }

  obtenerVarianteBoton(accion: AccionTabla<T>): string {
    return accion.variante || 'terciario';
  }

  obtenerTamanoBoton(accion: AccionTabla<T>): 'xs' | 'sm' | 'md' | 'lg' {
    return accion.tamano || 'sm';
  }

  // Nuevo método para determinar si una celda debe mostrar una etiqueta
  esCampoBooleano(columna: ConfiguracionColumna<T>): boolean {
    return columna.esBooleano === true && columna.etiquetasBooleanas !== undefined;
  }

  // Nuevo método para obtener la etiqueta booleana
  obtenerEtiquetaBooleana(valor: boolean, columna: ConfiguracionColumna<T>): { texto: string; clase: string } {
    if (!columna.etiquetasBooleanas) {
      return { texto: valor ? 'Sí' : 'No', clase: '' };
    }
    return valor ? columna.etiquetasBooleanas.true : columna.etiquetasBooleanas.false;
  }
}