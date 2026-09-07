import { Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables, ChartConfiguration, ChartType } from 'chart.js';
import { ReportesCotizacionesService } from '../../../../core/services/reportes-cotizaciones.service';
import { ExportService } from '../../../../core/services/export.service';
import {
  EstadisticasGeneralesDto,
  TopClienteDto,
  RendimientoAgenteDto,
  ProductoCotizadoDto,
  CotizacionPorRangoDto,
  CotizacionVencimientoDto
  
} from '../../../../core/models/reportes-cotizaciones.interface';
import { UiHeaderTabsComponent } from '../../../../shared/molecules/headerTab/headerTab.component';

Chart.register(...registerables);

export type TabOption = 'general' | 'clientes' | 'agentes' | 'productos' | 'rangos' | 'vencimientos';

export interface TabConfig {
  id: TabOption;
  label: string;
}

@Component({
  selector: 'app-metricas-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, UiHeaderTabsComponent],
  templateUrl: './metricas-documentos.component.html',
})


export class MetricasDocumentosComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  private reportesService = inject(ReportesCotizacionesService);
  private cdr = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  // Exponer Math para usar en el template
  Math = Math;

  // Configuración de tabs
  tabOptions: TabConfig[] = [
    { id: 'general', label: 'General' },
    { id: 'clientes', label: 'Top Clientes' },
    { id: 'agentes', label: 'Agentes' },
    { id: 'productos', label: 'Productos' },
    { id: 'rangos', label: 'Rangos de Monto' },
    { id: 'vencimientos', label: 'Próximas a Vencer' }
  ];

  activeTab: TabOption = 'general';
  error: string | null = null;

  // Filtros de fecha
  selectedMonth: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';

  // Paginación para próximas a vencer
  proximasVencerPage: number = 1;
  proximasVencerPageSize: number = 20;
  proximasVencerTotal: number = 0;

  // Data
  estadisticasGenerales: EstadisticasGeneralesDto | null = null;
  topClientes: TopClienteDto[] = [];
  rendimientoAgentes: RendimientoAgenteDto[] = [];
  productosMasCotizados: ProductoCotizadoDto[] = [];
  cotizacionesPorRango: CotizacionPorRangoDto[] = [];
  proximasVencer: CotizacionVencimientoDto[] = [];

  // ViewChild references para los canvas
  @ViewChild('generalStatusChart', { static: false }) generalStatusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topClientesChart', { static: false }) topClientesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rendimientoAgentesChart', { static: false }) rendimientoAgentesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productosChart', { static: false }) productosChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rangosChart', { static: false }) rangosChartRef!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private charts: { [key: string]: Chart } = {};

  // Control de renderizado
  private dataLoadedForTab: { [key: string]: boolean } = {};
  private viewChecked = false;

  ngOnInit() {
    this.setCurrentMonth();
    this.applyFilters();
  }

  ngAfterViewInit() {
    // Cargar datos iniciales después de que el DOM esté listo
    this.loadDataForTab(this.activeTab);
  }

  ngAfterViewChecked() {
    // Marcar que la vista ha sido verificada
    this.viewChecked = true;

    // Intentar renderizar gráficas si los datos están disponibles y es el tab activo
    this.tryRenderChartsForActiveTab();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  setActiveTab(tab: TabOption) {
    if (this.activeTab === tab) return; // Evitar recargas innecesarias

    this.activeTab = tab;
    this.error = null;
    this.destroyCharts(); // Limpiar gráficas anteriores

    // Resetear estado de carga para el nuevo tab
    this.dataLoadedForTab[tab] = false;

    // Cargar datos para el nuevo tab
    this.loadDataForTab(tab);
  }

  private tryRenderChartsForActiveTab() {
    if (!this.viewChecked) return;

    switch (this.activeTab) {
      case 'general':
        if (this.estadisticasGenerales && this.dataLoadedForTab['general']) {
          this.renderGeneralCharts();
        }
        break;
      case 'clientes':
        if (this.topClientes.length && this.dataLoadedForTab['clientes']) {
          this.renderTopClientesChart();
        }
        break;
      case 'agentes':
        if (this.rendimientoAgentes.length && this.dataLoadedForTab['agentes']) {
          this.renderRendimientoAgentesChart();
        }
        break;
      case 'productos':
        if (this.productosMasCotizados.length && this.dataLoadedForTab['productos']) {
          this.renderProductosChart();
        }
        break;
      case 'rangos':
        if (this.cotizacionesPorRango.length && this.dataLoadedForTab['rangos']) {
          this.renderRangosChart();
        }
        break;
    }
  }

  loadDataForTab(tab: string) {
    switch (tab) {
      case 'general':
        this.loadEstadisticasGenerales();
        break;
      case 'clientes':
        this.loadTopClientes();
        break;
      case 'agentes':
        this.loadRendimientoAgentes();
        break;
      case 'productos':
        this.loadProductosMasCotizados();
        break;
      case 'rangos':
        this.loadCotizacionesPorRango();
        break;
      case 'vencimientos':
        this.loadProximasVencer();
        break;
    }
  }

  private destroyCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  private destroyChart(key: string) {
    if (this.charts[key]) {
      this.charts[key].destroy();
      delete this.charts[key];
    }
  }

  // ==========================================
  // LOADERS
  // ==========================================

  loadEstadisticasGenerales() {
    this.reportesService.getEstadisticasGenerales(this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.estadisticasGenerales = response.data;
          this.dataLoadedForTab['general'] = true;
          // La gráfica se renderizará automáticamente en ngAfterViewChecked
        }
      },
      error: (err) => {
        this.error = 'Error al cargar estadísticas generales';
        console.error(err);
      }
    });
  }

  loadTopClientes() {
    this.reportesService.getTopClientes(10, this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.topClientes = response.data;
          this.dataLoadedForTab['clientes'] = true;
          // La gráfica se renderizará automáticamente en ngAfterViewChecked
        }
      },
      error: (err) => {
        this.error = 'Error al cargar top clientes';
        console.error(err);
      }
    });
  }

  loadRendimientoAgentes() {
    this.reportesService.getRendimientoAgentes(this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.rendimientoAgentes = response.data;
          this.dataLoadedForTab['agentes'] = true;
          // La gráfica se renderizará automáticamente en ngAfterViewChecked
        }
      },
      error: (err) => {
        this.error = 'Error al cargar rendimiento de agentes';
        console.error(err);
      }
    });
  }

  loadProductosMasCotizados() {
    this.reportesService.getProductosMasCotizados(10, this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.productosMasCotizados = response.data;
          this.dataLoadedForTab['productos'] = true;
          // La gráfica se renderizará automáticamente en ngAfterViewChecked
        }
      },
      error: (err) => {
        this.error = 'Error al cargar productos más cotizados';
        console.error(err);
      }
    });
  }

  loadCotizacionesPorRango() {
    this.reportesService.getCotizacionesPorRangoMonto(this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.cotizacionesPorRango = response.data;
          this.dataLoadedForTab['rangos'] = true;
          // La gráfica se renderizará automáticamente en ngAfterViewChecked
        }
      },
      error: (err) => {
        this.error = 'Error al cargar cotizaciones por rango';
        console.error(err);
      }
    });
  }

  loadProximasVencer() {
    this.reportesService.getCotizacionesProximasVencer(30, this.proximasVencerPage, this.proximasVencerPageSize).subscribe({
      next: (response) => {
        if (response.success) {
          this.proximasVencer = response.data;
          // Extraer el total de la paginación del response
          if (response.pagination) {
            this.proximasVencerTotal = response.pagination.totalRecords;
          }
        }
      },
      error: (err) => {
        this.error = 'Error al cargar cotizaciones próximas a vencer';
        console.error(err);
      }
    });
  }

  get totalProximasVencerPages(): number {
    return Math.ceil(this.proximasVencerTotal / this.proximasVencerPageSize);
  }

  nextProximasVencerPage() {
    if (this.proximasVencerPage < this.totalProximasVencerPages) {
      this.proximasVencerPage++;
      this.loadProximasVencer();
    }
  }

  previousProximasVencerPage() {
    if (this.proximasVencerPage > 1) {
      this.proximasVencerPage--;
      this.loadProximasVencer();
    }
  }

  applyFilters() {
    this.error = null;
    this.proximasVencerPage = 1;
    this.destroyCharts(); // Limpiar gráficas antes de recargar

    // Resetear estado de carga de datos
    this.dataLoadedForTab = {};

    this.loadDataForTab(this.activeTab);
  }

  clearFilters() {
    // Limpiar fechas (establecer a null/empty permite ver todos los datos históricos)
    this.fechaInicio = '';
    this.fechaFin = '';
    this.error = null;
    this.proximasVencerPage = 1;
    this.destroyCharts(); // Limpiar gráficas antes de recargar

    // Resetear estado de carga de datos
    this.dataLoadedForTab = {};

    // Recargar datos sin filtros
    this.loadDataForTab(this.activeTab);
  }

  /**
   * Establece el mes actual por defecto en el selector
   */
  setCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    this.selectedMonth = `${year}-${month}`;
    this.calculateDatesFromMonth();
  }

  /**
   * Calcula fecha inicio (día 1) y fin (último día) basado en el mes seleccionado
   */
  calculateDatesFromMonth() {
    if (!this.selectedMonth) return;

    const [year, month] = this.selectedMonth.split('-').map(Number);

    // Primer día del mes
    const firstDay = new Date(year, month - 1, 1);
    // Último día del mes (día 0 del mes siguiente)
    const lastDay = new Date(year, month, 0);

    this.fechaInicio = firstDay.toISOString().split('T')[0];
    this.fechaFin = lastDay.toISOString().split('T')[0];
  }

  /**
   * Ejecutado cuando el usuario cambia el mes en el input
   */
  onMonthChange() {
    this.calculateDatesFromMonth();
    this.applyFilters();
  }

  exportCurrentView(format: 'excel' | 'pdf') {
    const filename = `Reporte_${this.activeTab}_${this.selectedMonth}`;
    const dateRangeStr = `${this.fechaInicio} al ${this.fechaFin}`;

    // Helper para formatear moneda
    const currency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    switch (this.activeTab) {
      case 'general':
        if (!this.estadisticasGenerales) return;
        const generalData = [
          { Concepto: 'Total Cotizaciones', Valor: this.estadisticasGenerales.totalCotizaciones, Formatted: this.estadisticasGenerales.totalCotizaciones.toString() },
          { Concepto: 'Monto Total', Valor: this.estadisticasGenerales.montoTotal, Formatted: currency(this.estadisticasGenerales.montoTotal) },
          { Concepto: 'Promedio', Valor: this.estadisticasGenerales.montoPromedio, Formatted: currency(this.estadisticasGenerales.montoPromedio) },
          { Concepto: 'Cotizaciones Activas', Valor: this.estadisticasGenerales.cotizacionesActivas, Formatted: this.estadisticasGenerales.cotizacionesActivas.toString() },
          { Concepto: 'Cotizaciones Canceladas', Valor: this.estadisticasGenerales.cotizacionesCanceladas, Formatted: this.estadisticasGenerales.cotizacionesCanceladas.toString() }
        ];

        if (format === 'excel') {
          const excelData = generalData.map(d => ({ Concepto: d.Concepto, Valor: d.Valor }));
          this.exportService.exportToExcel(excelData, filename, 'General');
        } else {
          const columns = ['Concepto', 'Valor'];
          const rows = generalData.map(item => [item.Concepto, item.Formatted]);
          this.exportService.exportToPdf(columns, rows, 'Resumen General', filename, dateRangeStr);
        }
        break;

      case 'clientes':
        if (this.topClientes.length === 0) return;
        if (format === 'excel') {
          this.exportService.exportToExcel(this.topClientes, filename, 'Top Clientes');
        } else {
          const columns = ['Cliente', 'Monto Total', 'Cotizaciones'];
          const rows = this.topClientes.map(c => [c.razonSocial, currency(c.montoTotal), c.totalCotizaciones]);
          this.exportService.exportToPdf(columns, rows, 'Top Clientes', filename, dateRangeStr);
        }
        break;

      case 'agentes':
        if (this.rendimientoAgentes.length === 0) return;
        if (format === 'excel') {
          this.exportService.exportToExcel(this.rendimientoAgentes, filename, 'Rendimiento Agentes');
        } else {
          const columns = ['Agente', 'Activas', 'Canceladas', 'Monto Total'];
          const rows = this.rendimientoAgentes.map(a => [a.nombreAgente, a.cotizacionesActivas, a.cotizacionesCanceladas, currency(a.montoTotal)]);
          this.exportService.exportToPdf(columns, rows, 'Rendimiento Agentes', filename, dateRangeStr);
        }
        break;

      case 'productos':
        if (this.productosMasCotizados.length === 0) return;
        if (format === 'excel') {
          this.exportService.exportToExcel(this.productosMasCotizados, filename, 'Productos');
        } else {
          const columns = ['Producto', 'Código', 'Total Cotizaciones', 'Monto Total'];
          const rows = this.productosMasCotizados.map(p => [p.nombreProducto, p.codigoProducto, p.totalCotizaciones, currency(p.montoTotal)]);
          this.exportService.exportToPdf(columns, rows, 'Productos Más Cotizados', filename, dateRangeStr);
        }
        break;

      case 'rangos':
        if (this.cotizacionesPorRango.length === 0) return;
        if (format === 'excel') {
          this.exportService.exportToExcel(this.cotizacionesPorRango, filename, 'Rangos');
        } else {
          const columns = ['Rango', 'Total Cotizaciones', 'Monto Total'];
          const rows = this.cotizacionesPorRango.map(r => [r.rangoMonto, r.totalCotizaciones, currency(r.montoTotal)]);
          this.exportService.exportToPdf(columns, rows, 'Cotizaciones por Rango', filename, dateRangeStr);
        }
        break;

      case 'vencimientos':
        if (this.proximasVencer.length === 0) return;
        if (format === 'excel') {
          this.exportService.exportToExcel(this.proximasVencer, filename, 'Vencimientos');
        } else {
          const columns = ['Folio', 'Cliente', 'Fecha Vencimiento', 'Monto', 'Días Restantes'];
          const rows = this.proximasVencer.map(v => [v.folio, v.razonSocial, new Date(v.fechaVencimiento).toLocaleDateString(), currency(v.montoTotal), v.diasRestantes]);
          this.exportService.exportToPdf(columns, rows, 'Próximas a Vencer', filename, dateRangeStr);
        }
        break;
    }
  }

  // ==========================================
  // CHARTS RENDERING
  // ==========================================

  renderGeneralCharts() {
    if (!this.estadisticasGenerales || !this.generalStatusChartRef) return;

    this.destroyChart('generalStatus');

    const ctx = this.generalStatusChartRef.nativeElement;
    if (ctx) {
      this.charts['generalStatus'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Activas', 'Canceladas'],
          datasets: [{
            data: [
              this.estadisticasGenerales.cotizacionesActivas,
              this.estadisticasGenerales.cotizacionesCanceladas
            ],
            backgroundColor: ['#10B981', '#EF4444'],
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: 'Estado de Cotizaciones' }
          }
        }
      });
    }
  }

  renderTopClientesChart() {
    if (!this.topClientes.length || !this.topClientesChartRef) return;

    this.destroyChart('topClientes');

    const ctx = this.topClientesChartRef.nativeElement;
    if (ctx) {
      this.charts['topClientes'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.topClientes.map(c => (c.razonSocial || 'Cliente Desconocido').substring(0, 20) + '...'),
          datasets: [{
            label: 'Monto Total ($)',
            data: this.topClientes.map(c => c.montoTotal),
            backgroundColor: '#3B82F6',
            borderColor: '#2563EB',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Top 10 Clientes por Monto' }
          },
          scales: {
            x: {
              ticks: {
                callback: function (value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }
  }

  renderRendimientoAgentesChart() {
    if (!this.rendimientoAgentes.length || !this.rendimientoAgentesChartRef) return;

    this.destroyChart('rendimientoAgentes');

    const ctx = this.rendimientoAgentesChartRef.nativeElement;
    if (ctx) {
      this.charts['rendimientoAgentes'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.rendimientoAgentes.map(a => a.nombreAgente),
          datasets: [
            {
              label: 'Cotizaciones Activas',
              data: this.rendimientoAgentes.map(a => a.cotizacionesActivas || 0),
              backgroundColor: '#10B981'
            },
            {
              label: 'Cotizaciones Canceladas',
              data: this.rendimientoAgentes.map(a => a.cotizacionesCanceladas || 0),
              backgroundColor: '#EF4444'
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: { stacked: true },
            y: { stacked: true }
          },
          plugins: {
            title: { display: true, text: 'Rendimiento por Agente' }
          }
        }
      });
    }
  }

  renderProductosChart() {
    if (!this.productosMasCotizados.length || !this.productosChartRef) return;

    this.destroyChart('productos');

    const ctx = this.productosChartRef.nativeElement;
    if (ctx) {
      this.charts['productos'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.productosMasCotizados.map(p => (p.nombreProducto || 'Producto Desconocido').substring(0, 15) + '...'),
          datasets: [{
            label: 'Frecuencia de Cotización',
            data: this.productosMasCotizados.map(p => p.totalCotizaciones),
            backgroundColor: '#8B5CF6',
            borderColor: '#7C3AED',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Top 10 Productos Más Cotizados' }
          }
        }
      });
    }
  }

  renderRangosChart() {
    if (!this.cotizacionesPorRango.length || !this.rangosChartRef) return;

    this.destroyChart('rangos');

    const ctx = this.rangosChartRef.nativeElement;
    if (ctx) {
      this.charts['rangos'] = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: this.cotizacionesPorRango.map(r => r.rangoMonto),
          datasets: [{
            data: this.cotizacionesPorRango.map(r => r.totalCotizaciones),
            backgroundColor: [
              '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'right' },
            title: { display: true, text: 'Distribución por Rango de Monto' }
          }
        }
      });
    }
  }
}