import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteLegacyService } from '../../../../../core/services/cliente-legacy.service';
import { ClienteLegacyResponse } from '../../../../../core/models/cliente-legacy.interface';

// Importar componentes reutilizables
import { UiInputComponent } from '../../../../../shared/molecules/input/input.component';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiHeaderModal } from '../../../../../shared/molecules/headerModal/header-modal.component';
import { UitipografiaComponent } from '../../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-dialog-clientes',
  standalone: true,
  imports: [
    CommonModule,
    UiBotonComponent,
    UiIconComponent,
    UiHeaderModal,
    UitipografiaComponent
  ],
  templateUrl: './dialog-clientes.component.html',
  styleUrl: './dialog-clientes.component.css'
})
export class DialogClientesComponent implements OnChanges {
  @Input() clienteId: number | null = null;
  @Output() cerrar = new EventEmitter<void>();

  private clienteService = inject(ClienteLegacyService);

  // Señales de estado 
  mostrarEsqueleto = signal<boolean>(true);
  errorDeConexion = signal<boolean>(false);

  cliente = signal<ClienteLegacyResponse | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clienteId'] && this.clienteId) {
      this.cargarCliente();
    } else if (changes['clienteId'] && !this.clienteId) {
      this.cliente.set(null);
    }
  }

  cargarCliente(): void {
    if (!this.clienteId) return;

    this.mostrarEsqueleto.set(true);
    this.errorDeConexion.set(false);

    // Incluir detalles de ubicación completos
    this.clienteService.obtenerPorId(this.clienteId, true).subscribe({
      next: (cliente) => {
        this.cliente.set(cliente??null);
        this.mostrarEsqueleto.set(false);
      },
      error: (err) => {
        this.errorDeConexion.set(true);
        this.mostrarEsqueleto.set(false);
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
