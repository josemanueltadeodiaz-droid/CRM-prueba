import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoLegacyService } from '../../../../../core/services/producto-legacy.service';
import { ProductoLegacyResponse } from '../../../../../core/models/producto-legacy.interface';
import { UiHeaderModal } from '../../../../../shared/molecules/headerModal/header-modal.component';
import { UitipografiaComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-dialog-productos',
  standalone: true,
  imports: [CommonModule,UiHeaderModal,UitipografiaComponent, UiIconComponent, UiBotonComponent],
  templateUrl: './dialog-productos.component.html',
})
export class DialogProductosComponent implements OnChanges {
  @Input() productoId: number | null = null;
  @Output() cerrar = new EventEmitter<void>();

  private productoService = inject(ProductoLegacyService);

  // Señales de estado 
  mostrarEsqueleto = signal<boolean>(true);
  monstrarDatos = signal<boolean>(false);
  errorDeConexion = signal<boolean>(false);
  producto = signal<ProductoLegacyResponse | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productoId'] && this.productoId) {
      this.cargarProducto();
    } else if (changes['productoId'] && !this.productoId) {
      this.producto.set(null);
    }
  }

  cargarProducto(): void {
    if (!this.productoId) return;

    this.mostrarEsqueleto.set(true);
    this.errorDeConexion.set(false);

    this.productoService.obtenerPorId(this.productoId).subscribe({
      next: (producto) => {
        this.producto.set(producto);
        this.mostrarEsqueleto.set(false);
        this.errorDeConexion.set(false);

      },
      error: (err) => {
        this.mostrarEsqueleto.set(false);
        this.errorDeConexion.set(true);

      }
    });
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }
}
