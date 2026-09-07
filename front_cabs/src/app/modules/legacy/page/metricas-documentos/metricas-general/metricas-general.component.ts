import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportesCotizacionesService } from '../../../../../core/services/reportes-cotizaciones.service';
import { ExportService } from '../../../../../core/services/export.service';
import { 
  EstadisticasGeneralesDto, 
  AdmEstadisticasMensualesDto 
} from '../../../../../core/models/reportes-cotizaciones.interface';
import { UiCardComponent } from "../../../../../shared/molecules/card/card.component";
import { VarianteEtiqueta } from '../../../../../shared/molecules/etiqueta/etiqueta.component';
import { UitipografiaComponent } from '../../../../../shared/atoms/tipografia/tipografia.component';
import { MatDialogClose } from "@angular/material/dialog";
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';

Chart.register(...registerables);

interface TarjetaKpi {
  id: number;
  nameIcono: string;
  titulo: string;
  valor: number ;
  porcentaje?: string;
  estadoEtiqueta: VarianteEtiqueta;
  viewLabel: boolean;
  viewSimbolo: boolean;
  viewDescripcion: boolean;
  descripcion?: string;
}

@Component({
  selector: 'app-metricas-general',
  standalone: true,
  imports: [CommonModule, UiIconComponent, FormsModule, UiHeaderComponent, UiBotonComponent, UiCardComponent, UitipografiaComponent],
  templateUrl: './metricas-general.component.html',
})
export class MetricasGeneralComponent implements OnInit, OnDestroy, AfterViewInit {
  private reportesService = inject(ReportesCotizacionesService);
  private cd = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  Math = Math;
  error: string | null = null;

  // Filtros
  selectedMonth: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  mesDisplay: string = '';

  // Data
  estadisticas: EstadisticasGeneralesDto | null = null;
  datosMensuales: AdmEstadisticasMensualesDto[] = []; // <-- NUEVA PROPIEDAD

  isDialogOpen = false;
  tarjetasKpi: TarjetaKpi[] = [];

  // Charts
  @ViewChild('statusChart', { static: false }) statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyTrendChart', { static: false }) monthlyTrendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('amountsChart', { static: false }) amountsChartRef!: ElementRef<HTMLCanvasElement>;

  private statusChart: Chart | null = null;
  private monthlyChart: Chart | null = null;
  private amountsChart: Chart | null = null;

  toggleDialog() {
    this.isDialogOpen = !this.isDialogOpen;
  }

  ngOnInit() {
    this.setCurrentMonth();
    this.calculateDatesFromMonth();
  }

  setCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    this.selectedMonth = `${year}-${month}`;
    this.updateMesDisplay();
  }

  updateMesDisplay() {
    if (this.selectedMonth) {
      const [year, month] = this.selectedMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      this.mesDisplay = date.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
      });
    } else {
      this.mesDisplay = '';
    }
  }

  onMonthChange() {
    this.updateMesDisplay();
    this.calculateDatesFromMonth();
  }

  calculateDatesFromMonth() {
    if (!this.selectedMonth) return;

    const [year, month] = this.selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    this.fechaInicio = firstDay.toISOString().split('T')[0];
    this.fechaFin = lastDay.toISOString().split('T')[0];
  }

  ngAfterViewInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.destruirGraficas();
  }

  // <-- MÉTODO MODIFICADO: Ahora carga estadísticas generales y luego datos mensuales
  cargarDatos() {
    this.error = null;
    
    // Obtener estadísticas generales
    this.reportesService.getEstadisticasGenerales(this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.estadisticas = response.data;
          this.configurarTarjetasKpi();
          this.cd.detectChanges();
          
          // Después de obtener estadísticas generales, obtener datos mensuales
          this.cargarDatosMensuales();
        }
      },
      error: (err) => {
        this.error = 'Error al cargar estadísticas generales';
        console.error(err);
        // Aún intentamos cargar datos mensuales
        this.cargarDatosMensuales();
      }
    });
  }

  // <-- NUEVO MÉTODO: Cargar datos mensuales
  cargarDatosMensuales() {
    // Obtener el año de la fecha seleccionada o usar el actual
    const año = this.fechaFin ? new Date(this.fechaFin).getFullYear() : new Date().getFullYear();
    
    this.reportesService.getEstadisticasMensuales(año).subscribe({
      next: (response) => {
        if (response.success) {
          this.datosMensuales = response.data;
          this.cd.detectChanges();
          
          // Renderizar todas las gráficas incluyendo la mensual
          setTimeout(() => this.renderizarGraficas(), 100);
        } else {
          setTimeout(() => this.renderizarGraficas(), 100);
        }
      },
      error: (err) => {
        console.error('Error al cargar datos mensuales:', err);
        // Aún así renderizar las otras gráficas
        setTimeout(() => this.renderizarGraficas(), 100);
      }
    });
  }

  aplicarFiltros() {
    if (!this.selectedMonth) {
      this.setCurrentMonth();
      this.calculateDatesFromMonth();
    }
    this.destruirGraficas();
    this.cargarDatos();
  }

  limpiarFiltros() {
    this.setCurrentMonth();
    this.calculateDatesFromMonth();
    this.destruirGraficas();
    this.cargarDatos();
  }

  private configurarTarjetasKpi() {
    if (!this.estadisticas) return;

    console.log('DEBUG - Estadísticas recibidas:', this.estadisticas);
    console.log('DEBUG - Propiedades disponibles:', Object.keys(this.estadisticas));

    // Buscar la propiedad correcta para el monto
    let montoTotal = 0;
    if (this.estadisticas.montoTotal !== undefined) {
      montoTotal = this.estadisticas.montoTotal;
    } else if ((this.estadisticas as any).montoTotalActivo !== undefined) {
      montoTotal = (this.estadisticas as any).montoTotalActivo;
    } else if ((this.estadisticas as any).totalMonto !== undefined) {
      montoTotal = (this.estadisticas as any).totalMonto;
    } else if ((this.estadisticas as any).montoTotalCotizaciones !== undefined) {
      montoTotal = (this.estadisticas as any).montoTotalCotizaciones;
    }

    console.log('DEBUG - Monto total encontrado:', montoTotal);

    this.tarjetasKpi = [
      {
        id: 1,
        nameIcono: 'document-duplicate',
        titulo: 'Cotizaciones',
        valor: this.estadisticas.totalCotizaciones || 0,
        estadoEtiqueta: 'neutral' as VarianteEtiqueta,
        viewLabel: false,
        viewSimbolo: false,
        viewDescripcion: true,
        descripcion: 'Total registrado en el periodo'
      },
      {
        id: 2,
        nameIcono: 'currency-dollar',
        titulo: 'Monto Total',
        valor: montoTotal,
        estadoEtiqueta: 'positivo' as VarianteEtiqueta,
        viewLabel: false,
        viewSimbolo: true,
        viewDescripcion: true,
        descripcion: 'Volumen de ventas potencial'
      },
      {
        id: 3,
        nameIcono: 'ticket',
        titulo: 'Ticket promedio',
        valor: this.estadisticas.montoPromedio || 0,
        estadoEtiqueta: 'neutral' as VarianteEtiqueta,
        viewLabel: false,
        viewSimbolo: true,
        viewDescripcion: true,
        descripcion: 'Valor medio de cotización'
      },
      {
        id: 4,
        nameIcono: 'user-group',
        titulo: 'Clientes únicos',
        valor: this.estadisticas.clientesUnicos || 0,
        estadoEtiqueta: 'positivo' as VarianteEtiqueta,
        viewLabel: false,
        viewSimbolo: false,
        viewDescripcion: true,
        descripcion: 'Clientes con cotizaciones'
      }
    ];
  }

  private renderizarGraficas() {
    if (!this.estadisticas) return;

    try {
      this.renderizarGraficaEstados();
    } catch (e) {
      console.error('Error rendering status chart', e);
    }

    try {
      this.renderizarTendenciaMensual();
    } catch (e) {
      console.error('Error rendering monthly trend chart', e);
    }

    try {
      this.renderizarGraficaMontos();
    } catch (e) {
      console.error('Error rendering amounts chart', e);
    }
  }

  private renderizarGraficaEstados() {
    if (!this.estadisticas || !this.statusChartRef) return;

    const ctx = this.statusChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.destruirGrafica('status');

    const total = this.estadisticas.totalCotizaciones;
    const data = [
      { label: 'Pendientes', value: this.estadisticas.pendientes || 0, color: '#FCD34D' },
      { label: 'Aprobadas', value: this.estadisticas.aprobadas || 0, color: '#34D399' },
      { label: 'Rechazadas', value: this.estadisticas.rechazadas || 0, color: '#F87171' },
      { label: 'En Revisión', value: this.estadisticas.enRevision || 0, color: '#60A5FA' },
      { label: 'Vencidas', value: this.estadisticas.vencidas || 0, color: '#9CA3AF' }
    ];

    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color),
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 11, family: "'Inter', sans-serif" },
              color: '#6B7280'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1F2937',
            bodyColor: '#4B5563',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            padding: 12,
            boxPadding: 4,
            callbacks: {
              label: (context: any) => {
                const value = context.parsed;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return ` ${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    } as any);
  }

  // <-- MÉTODO MODIFICADO: Ahora usa datosMensuales en lugar de tendenciaMensual
  private renderizarTendenciaMensual() {
    console.log('=== DEBUG Gráfica Tendencia Mensual ===');
    console.log('datosMensuales:', this.datosMensuales);
    
    // Usar datosMensuales en lugar de tendenciaMensual
    if (!this.datosMensuales?.length) {
      console.log('No hay datos mensuales disponibles');
      return;
    }

    if (!this.monthlyTrendChartRef) {
      console.log('No se encontró la referencia al canvas');
      return;
    }

    const ctx = this.monthlyTrendChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.log('No se pudo obtener el contexto 2d del canvas');
      return;
    }

    this.destruirGrafica('monthly');

    // Procesar datosMensuales (formato diferente)
    const labels = this.datosMensuales.map(d => {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return meses[d.mes - 1]; // mes viene como número 1-12
    });

    // Calcular total de cotizaciones (activas + canceladas)
    const cotizacionesData = this.datosMensuales.map(d => d.cotizacionesActivas + d.cotizacionesCanceladas);
    const montosData = this.datosMensuales.map(d => d.montoTotal);

    console.log('Labels generados:', labels);
    console.log('Datos cotizaciones:', cotizacionesData);
    console.log('Datos montos:', montosData);

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    try {
      this.monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Cotizaciones',
              data: cotizacionesData,
              borderColor: '#10B981',
              backgroundColor: gradient,
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#10B981',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: 'Monto Total',
              data: montosData,
              borderColor: '#3B82F6',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.4,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                boxWidth: 8,
                font: { size: 11, family: "'Inter', sans-serif" }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1F2937',
              bodyColor: '#4B5563',
              borderColor: '#E5E7EB',
              borderWidth: 1,
              padding: 12,
              titleFont: { size: 13, weight: 'bold' },
              callbacks: {
                label: (context: any) => {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    if (context.dataset.yAxisID === 'y1') {
                      label += new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(context.parsed.y);
                    } else {
                      label += context.parsed.y;
                    }
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              grid: {
                color: '#F3F4F6'
              },
              ticks: {
                font: { size: 11 },
                color: '#9CA3AF',
                stepSize: 1,
                callback: (value: any) => {
                  if (Number.isInteger(value)) {
                    return value;
                  }
                  return null;
                }
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: {
                drawOnChartArea: false
              },
              ticks: {
                font: { size: 11 },
                color: '#9CA3AF',
                callback: (value: any) => {
                  if (value >= 1000000) return '$' + (value/1000000).toFixed(1) + 'M';
                  if (value >= 1000) return '$' + (value/1000).toFixed(0) + 'k';
                  return '$' + value;
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: { size: 11 },
                color: '#9CA3AF'
              }
            }
          }
        }
      });
      console.log('Gráfica de tendencia creada exitosamente');
    } catch (error) {
      console.error('Error al crear la gráfica:', error);
    }
  }

  private renderizarGraficaMontos() {
    if (!this.estadisticas || !this.amountsChartRef) return;

    const ctx = this.amountsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.destruirGrafica('amounts');

    this.amountsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Mínimo', 'Promedio', 'Máximo'],
        datasets: [{
          label: 'Montos',
          data: [
            this.estadisticas.montoMinimo || 0,
            this.estadisticas.montoPromedio || 0,
            this.estadisticas.montoMaximo || 0
          ],
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ],
          borderRadius: 6,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1F2937',
            bodyColor: '#4B5563',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context: any) => {
                const value = context.parsed.y;
                return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#F3F4F6'
            },
            ticks: {
              font: { size: 11 },
              color: '#9CA3AF',
              callback: (value: any) => {
                if (value >= 1000000) return '$' + (value/1000000).toFixed(1) + 'M';
                if (value >= 1000) return '$' + (value/1000).toFixed(0) + 'k';
                return '$' + value;
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 12, weight: 'bold' },
              color: '#4B5563'
            }
          }
        }
      }
    } as any);
  }

  private destruirGraficas() {
    this.destruirGrafica('status');
    this.destruirGrafica('monthly');
    this.destruirGrafica('amounts');
  }

  private destruirGrafica(key: string) {
    if (key === 'status' && this.statusChart) {
      this.statusChart.destroy();
      this.statusChart = null;
    }
    if (key === 'monthly' && this.monthlyChart) {
      this.monthlyChart.destroy();
      this.monthlyChart = null;
    }
    if (key === 'amounts' && this.amountsChart) {
      this.amountsChart.destroy();
      this.amountsChart = null;
    }
  }

  exportToExcel() {
    if (!this.estadisticas) return;

    const data = [{
      'Total de Cotizaciones': this.estadisticas.totalCotizaciones,
      'Monto Total': this.estadisticas.montoTotal,
      'Monto Promedio': this.estadisticas.montoPromedio,
      'Monto Máximo': this.estadisticas.montoMaximo,
      'Monto Mínimo': this.estadisticas.montoMinimo,
      'Cotizaciones Activas': this.estadisticas.cotizacionesActivas,
      'Cotizaciones Canceladas': this.estadisticas.cotizacionesCanceladas,
      'Clientes Únicos': this.estadisticas.clientesUnicos,
      'Productos Únicos': this.estadisticas.productosUnicos,
      'Pendientes': this.estadisticas.pendientes || 0,
      'Aprobadas': this.estadisticas.aprobadas || 0,
      'Rechazadas': this.estadisticas.rechazadas || 0,
      'En Revisión': this.estadisticas.enRevision || 0,
      'Vencidas': this.estadisticas.vencidas || 0
    }];

    this.exportService.exportToExcel(
      data,
      `estadisticas-generales_${this.fechaInicio}_to_${this.fechaFin}`,
      'Estadísticas Generales'
    );
  }

  exportToPdf() {
    if (!this.estadisticas) return;

    const headers = [
      'Métrica', 'Valor'
    ];

    const data = [
      ['Total de Cotizaciones', this.estadisticas.totalCotizaciones.toString()],
      ['Monto Total', `$${this.estadisticas.montoTotal.toLocaleString()}`],
      ['Monto Promedio', `$${this.estadisticas.montoPromedio.toLocaleString()}`],
      ['Monto Máximo', `$${this.estadisticas.montoMaximo.toLocaleString()}`],
      ['Monto Mínimo', `$${this.estadisticas.montoMinimo.toLocaleString()}`],
      ['Cotizaciones Activas', this.estadisticas.cotizacionesActivas.toString()],
      ['Cotizaciones Canceladas', this.estadisticas.cotizacionesCanceladas.toString()],
      ['Clientes Únicos', this.estadisticas.clientesUnicos.toString()],
      ['Productos Únicos', this.estadisticas.productosUnicos.toString()],
      ['Pendientes', (this.estadisticas.pendientes || 0).toString()],
      ['Aprobadas', (this.estadisticas.aprobadas || 0).toString()],
      ['Rechazadas', (this.estadisticas.rechazadas || 0).toString()],
      ['En Revisión', (this.estadisticas.enRevision || 0).toString()],
      ['Vencidas', (this.estadisticas.vencidas || 0).toString()]
    ];

    this.exportService.exportToPdf(
      headers,
      data,
      `Estadísticas Generales - ${this.fechaInicio} a ${this.fechaFin}`,
      'Estadísticas Generales'
    );
  }
}