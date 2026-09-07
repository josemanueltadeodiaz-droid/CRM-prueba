import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportesCotizacionesService } from '../../../../../core/services/reportes-cotizaciones.service';
import { ExportService } from '../../../../../core/services/export.service';
import { TopClienteDto } from '../../../../../core/models/reportes-cotizaciones.interface';
import { UitipografiaComponent } from '../../../../../shared/atoms/tipografia/tipografia.component';
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiInputComponent } from '../../../../../shared/~exports/filter-system.index';

Chart.register(...registerables);

@Component({
  selector: 'app-top-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, UiHeaderComponent, UitipografiaComponent, UiBotonComponent, UiIconComponent, UiInputComponent],
  templateUrl: './top-clientes.component.html',
})
export class TopClientesComponent implements OnInit, OnDestroy, AfterViewInit {
  private reportesService = inject(ReportesCotizacionesService);
  private cd = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  // Variables de estado
  error: string | null = null;
  clientes: TopClienteDto[] = [];
  isLoading: boolean = false;
  isDialogOpen = false; // Controla visibilidad del diálogo de descargas

  // Variables de filtros (visibles en la UI)
  fechaInicio: string = ''; // Formato YYYY-MM (para input month)
  fechaFin: string = ''; // Formato YYYY-MM-DD (para el servicio)
  fechaFinFormatted: string = ''; // Formato YYYY-MM-DD
  topLimit: number = 10; // Valor por defecto: Top 10

  // Array de opciones para el select de top limit
  opcionesRango = [
    { value: 5, label: 'Top 5' },
    { value: 10, label: 'Top 10' },
    { value: 15, label: 'Top 15' },
    { value: 20, label: 'Top 20' },
  ];

  // Referencia al elemento canvas para el gráfico
  @ViewChild('clientesChart', { static: false }) chartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngOnInit() {
    // Establece filtros por defecto al iniciar
    this.setFiltrosPorDefecto();
    
    // Carga datos automáticamente con filtros por defecto
    this.cargarDatos();
  }

  /**
   * Establece los filtros por defecto:
   * - Mes actual en formato YYYY-MM
   * - Top 10 agentes
   */
  private setFiltrosPorDefecto() {
    // Establece el mes actual
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    this.fechaInicio = `${year}-${month}`;
    
    // Calcula fechas de inicio y fin del mes
    this.calculateDatesFromMonth(this.fechaInicio);
    
    // Establece top limit por defecto
    this.topLimit = 10;
  }

  /**
   * Calcula las fechas de inicio y fin a partir de un mes en formato YYYY-MM
   */
  private calculateDatesFromMonth(monthValue: string) {
    if (!monthValue) return;
    
    const [year, month] = monthValue.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    this.fechaFin = firstDay.toISOString().split('T')[0];
    this.fechaFinFormatted = lastDay.toISOString().split('T')[0];
  }

  /**
   * Maneja el cambio en el input de mes
   * Solo actualiza las fechas, NO aplica filtros automáticamente
   */
  onMonthChange() {
    // Cuando cambia el input month, actualizamos las fechas
    this.calculateDatesFromMonth(this.fechaInicio);
  }

  /**
   * Maneja el cambio en el select de top limit
   * Solo actualiza el valor, NO aplica filtros automáticamente
   */
  onTopLimitChange() {
    // El valor ya está actualizado en this.topLimit gracias a ngModel
    // No hacemos nada más aquí, se aplicará cuando el usuario presione "Buscar"
  }

  ngAfterViewInit() {
    // Ya cargamos datos en ngOnInit, no es necesario hacerlo aquí
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  /**
   * Aplica los filtros seleccionados y carga los datos
   */
  aplicarFiltros() {
    // Valida que haya una fecha de inicio seleccionada
    if (!this.fechaInicio) {
      this.error = 'Por favor, selecciona un periodo de análisis';
      return;
    }
    
    // Asegura que las fechas estén actualizadas
    this.calculateDatesFromMonth(this.fechaInicio);
    
    // Limpia el gráfico anterior si existe
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    
    // Limpia datos anteriores
    this.clientes = [];
    
    // Carga los datos con los filtros actuales
    this.cargarDatos();
  }

  /**
   * Carga los datos del servicio usando los filtros actuales
   */
  cargarDatos() {
    this.isLoading = true;
    this.error = null;
    
    // Valida que haya una fecha de inicio seleccionada
    if (!this.fechaInicio) {
      this.error = 'Por favor, selecciona un periodo de análisis';
      this.isLoading = false;
      return;
    }
    
    // Asegura que las fechas estén actualizadas
    this.calculateDatesFromMonth(this.fechaInicio);

    this.reportesService.getTopClientes(this.topLimit, this.fechaFin, this.fechaFinFormatted).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.clientes = response.data;
          this.cd.detectChanges();
          this.renderizarGrafica();
        } else {
          this.error = 'No se pudieron cargar los datos';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Error al cargar top clientes';
        console.error(err);
      }
    });
  }

  /**
   * Limpia todos los filtros y restablece valores por defecto
   */
  limpiarFiltros() {
    // Restablece a filtros por defecto
    this.setFiltrosPorDefecto();
    
    // Limpia datos actuales
    this.clientes = [];
    this.error = null;
    
    // Limpia el gráfico
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    
    // Vuelve a cargar datos con filtros por defecto
    this.cargarDatos();
  }

  /**
   * Controla la visibilidad del diálogo de descargas
   */
  toggleDialog() {
    this.isDialogOpen = !this.isDialogOpen;
  }

  /**
   * Cierra el diálogo de descargas
   */
  private closeDialog() {
    this.isDialogOpen = false;
  }

  /**
   * Renderiza o actualiza el gráfico con los datos actuales
   */
  private renderizarGrafica() {
    if (!this.clientes.length || !this.chartRef) return;
    
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.clientes.map(c => c.razonSocial || c.codigoCliente),
        datasets: [{
          label: 'Monto Total',
          data: this.clientes.map(c => c.montoTotal),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2
        }, {
          label: 'Total Cotizaciones',
          data: this.clientes.map(c => c.totalCotizaciones),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Monto Total ($)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Cantidad' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  /**
   * Exporta los datos actuales a formato Excel
   */
  exportToExcel() {
    this.closeDialog();
    if (this.clientes.length === 0) {
      this.error = 'No hay datos para exportar. Aplica filtros primero.';
      return;
    }
    const filename = `Top_Clientes_${this.fechaFin}_${this.fechaFinFormatted}`;
    this.exportService.exportToExcel(this.clientes, filename, 'Top Clientes');
  }

  /**
   * Exporta los datos actuales a formato PDF
   */
  exportToPdf() {
    this.closeDialog();
    if (this.clientes.length === 0) {
      this.error = 'No hay datos para exportar. Aplica filtros primero.';
      return;
    }
    const filename = `Top_Clientes_${this.fechaFin}_${this.fechaFinFormatted}`;
    const dateRangeStr = `${this.fechaFin} al ${this.fechaFinFormatted}`;
    const columns = ['Cliente', 'Código', 'Monto Total', 'Total Cotizaciones'];
    const rows = this.clientes.map(c => [
      c.razonSocial || 'N/A',
      c.codigoCliente || 'N/A',
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c.montoTotal),
      c.totalCotizaciones.toString()
    ]);
    this.exportService.exportToPdf(columns, rows, 'Top Clientes', filename, dateRangeStr);
  }
}