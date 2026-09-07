import { Component, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesCotizacionesService } from '../../../../../core/services/reportes-cotizaciones.service';
import { CotizacionVencimientoDto } from '../../../../../core/models/reportes-cotizaciones.interface';
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';
import { UiInputComponent } from '../../../../../shared/~exports/filter-system.index';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-metricas-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, UiHeaderComponent, UiInputComponent, UiBotonComponent, UiIconComponent],
  templateUrl: './metricas-cotizaciones.component.html',
})
export class MetricasCotizacionesComponent implements OnInit {
  private reportesService = inject(ReportesCotizacionesService);
  private cd = inject(ChangeDetectorRef);

  errorDeConexion = signal<boolean>(false);
  monstrarDatos = signal<boolean>(false);

  Math = Math; // Para usar en el template
  error: string | null = null;
  diasProximos: number = 30;
  currentPage: number = 1;
  pageSize: number = 20;
  totalRegistros: number = 0;
  cotizaciones: CotizacionVencimientoDto[] = [];
  todasCotizaciones: CotizacionVencimientoDto[] = []; // Para almacenar todas las cotizaciones

  // Opciones para el select de días próximos
  opcionesDiasProximos = [
    { value: 7, label: '7 días' },
    { value: 15, label: '15 días' },
    { value: 30, label: '30 días' },
    { value: 60, label: '60 días' },
    { value: 90, label: '90 días' }
  ];

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.error = null;
    
    console.log('Solicitando cotizaciones que vencen en los próximos', this.diasProximos, 'días');
    
    this.reportesService.getCotizacionesProximasVencer(
      90, // Siempre pedimos 90 días para tener todos los datos
      this.currentPage, 
      this.pageSize
    ).subscribe({
      next: (response) => {
        if (response.success) {
          // Almacenamos todas las cotizaciones
          this.todasCotizaciones = response.data;
          
          // Filtramos en el frontend según el valor seleccionado
          this.filtrarCotizacionesPorDias();
          
          // Actualizamos el total de registros para la paginación
          this.totalRegistros = this.cotizaciones.length;
          this.cd.detectChanges();
          this.monstrarDatos.set(true);

        }
      },
      error: (err) => {
        this.error = 'Error al cargar cotizaciones próximas a vencer';
        console.error('Error:', err);
        this.errorDeConexion.set(true);
      }
    });
  }

  // Método para filtrar las cotizaciones por días
  filtrarCotizacionesPorDias() {
    if (this.diasProximos === 7) {
      // Para 7 días: mostramos 0-7 días
      this.cotizaciones = this.todasCotizaciones.filter(
        cotizacion => cotizacion.diasRestantes >= 0 && cotizacion.diasRestantes <= 7
      );
    } else if (this.diasProximos === 15) {
      // Para 15 días: mostramos 0-15 días
      this.cotizaciones = this.todasCotizaciones.filter(
        cotizacion => cotizacion.diasRestantes >= 0 && cotizacion.diasRestantes <= 15
      );
    } else {
      // Para otros valores: mostramos 0-díasProximos
      this.cotizaciones = this.todasCotizaciones.filter(
        cotizacion => cotizacion.diasRestantes >= 0 && cotizacion.diasRestantes <= this.diasProximos
      );
    }
    
    console.log(`Filtrado: ${this.cotizaciones.length} cotizaciones en 0-${this.diasProximos} días`);
  }

  aplicarFiltros() {
    this.currentPage = 1; // Resetear a la primera página
    
    // Si ya tenemos todas las cotizaciones, solo filtramos
    if (this.todasCotizaciones.length > 0) {
      this.filtrarCotizacionesPorDias();
      this.totalRegistros = this.cotizaciones.length;
    } else {
      // Si no, cargamos los datos
      this.cargarDatos();
    }
  }

  limpiarFiltros() {
    this.diasProximos = 30;
    this.currentPage = 1;
    this.aplicarFiltros();
  }

  cambiarPagina(nuevaPagina: number) {
    this.currentPage = nuevaPagina;
    // Para paginación en frontend, simplemente actualizamos la página
    // No necesitamos recargar datos porque ya tenemos todas las cotizaciones
  }

  cambiarTamanoPagina(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize = parseInt(select.value, 10);
    this.currentPage = 1; // Reset a primera página
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalRegistros / this.pageSize);
  }

  getPaginasVisibles(): number[] {
    const paginasTotales = this.totalPaginas;
    if (paginasTotales === 0) return [];
    
    const paginasVisibles: number[] = [];
    const inicio = Math.max(1, this.currentPage - 2);
    const fin = Math.min(paginasTotales, this.currentPage + 2);
    
    for (let i = inicio; i <= fin; i++) {
      paginasVisibles.push(i);
    }
    
    return paginasVisibles;
  }

  getNivelUrgenciaClass(diasRestantes: number): string {
    if (diasRestantes <= 7) return 'bg-red-100 text-red-700';
    if (diasRestantes <= 15) return 'bg-orange-100 text-orange-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  getNivelUrgenciaTexto(diasRestantes: number): string {
    if (diasRestantes <= 7) return 'Crítico';
    if (diasRestantes <= 15) return 'Importante';
    return 'Normal';
  }
}