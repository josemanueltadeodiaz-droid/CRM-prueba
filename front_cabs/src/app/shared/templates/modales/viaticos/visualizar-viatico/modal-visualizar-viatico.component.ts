// viaticos-detalle.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { GastoViaticoService } from '../../../../../core/services/gasto-viatico.service';
import { GastoViaticoResponse } from '../../../../../core/models/gasto-viatico.interface';

import { UitipografiaComponent } from '../../../../../shared/atoms/tipografia/tipografia.component';
import { UiHeaderModal } from '../../../../molecules/headerModal/header-modal.component';
import { UiDividerComponent } from '../../../../atoms/linea/linea.component';

// Interface para los datos del diálogo
export interface ViaticosDetalleData {
  viaticoId: number;
}

@Component({
  selector: 'app-viaticos-detalle',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    UitipografiaComponent,
    UiDividerComponent,
    UiHeaderModal
  ],
  providers: [DatePipe],
  templateUrl: './modal-visualizar-viatico.component.html'
})
export class ModalVisualizarViaticos implements OnInit {
  private viaticoService = inject(GastoViaticoService);
  private datePipe = inject(DatePipe);
  
  // MatDialogRef para manejar el diálogo
  private dialogRef = inject(MatDialogRef<ModalVisualizarViaticos>);
  private dialogData = inject<ViaticosDetalleData>(MAT_DIALOG_DATA);

  viatico: GastoViaticoResponse | null = null;
  cargando = false;
  error = '';
  
  // ID del viático desde los datos del diálogo
  private viaticoId: number;

  constructor() {
    this.viaticoId = this.dialogData.viaticoId;
  }

  ngOnInit(): void {
    this.cargarDetalle();
  }

  private cargarDetalle(): void {
    this.cargando = true;
    this.error = '';

    // CORRECCIÓN: Usar obtenerPorId() en lugar de obtenerViaticos()
    this.viaticoService.obtenerPorId(this.viaticoId).subscribe({
      next: (data: GastoViaticoResponse) => {  // Tipo explícito
        this.viatico = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar viático:', err);
        this.error = 'No se pudo cargar el viático. Por favor, intente nuevamente.';
        this.cargando = false;
      }
    });
  }

  onCerrar(): void {
    this.dialogRef.close();
  }

  reintentar(): void {
    this.cargarDetalle();
  }

  // Getters para la vista
  get tituloDialog(): string {
    return this.viatico ? `Viático #${this.viatico.id}` : 'Detalles del Viático';
  }

  get mostrar(): boolean {
    return true; // Siempre visible cuando se abre como MatDialog
  }

  // Métodos de formato para la vista
  formatearFecha(fecha: string): string {
    return this.datePipe.transform(fecha, 'dd/MM/yyyy') || 'No especificada';
  }

  formatearMonto(monto: number): string {
    // Usar el método del servicio si está disponible, o formatear manualmente
    if (this.viaticoService['formatearMoneda']) {
      return this.viaticoService['formatearMoneda'](monto);
    }
    return `$${monto.toFixed(2)}`;
  }

  formatearKilometros(km: number | null): string {
    return km !== null ? `${km.toFixed(0)} km` : '';
  }

  // Método para formatear los gastos (array desde string)
  formatearGastos(gastosStr: string): string[] {
    if (this.viaticoService['parsearGastos']) {
      return this.viaticoService['parsearGastos'](gastosStr);
    }
    // Fallback si no existe el método en el servicio
    return gastosStr
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);
  }

  // Método para obtener clase CSS según tieneFactura
  obtenerClaseFactura(tieneFactura: boolean): string {
    if (this.viaticoService['obtenerClaseFactura']) {
      return this.viaticoService['obtenerClaseFactura'](tieneFactura);
    }
    // Fallback
    return tieneFactura 
      ? 'bg-green-100 text-green-800 border border-green-300' 
      : 'bg-gray-100 text-gray-800 border border-gray-300';
  }

  // Método para obtener label de factura
  obtenerLabelFactura(tieneFactura: boolean): string {
    if (this.viaticoService['obtenerLabelFactura']) {
      return this.viaticoService['obtenerLabelFactura'](tieneFactura);
    }
    return tieneFactura ? 'Con Factura' : 'Sin Factura';
  }
}