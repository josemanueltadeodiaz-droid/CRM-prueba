import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportesCotizacionesService } from '../../../../../core/services/reportes-cotizaciones.service';
import { ExportService } from '../../../../../core/services/export.service';
import { ProductoCotizadoDto } from '../../../../../core/models/reportes-cotizaciones.interface';
import { UitipografiaComponent } from "../../../../../shared/~exports/detail-view.index";
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';
import { UiInputComponent } from '../../../../../shared/~exports/filter-system.index';

Chart.register(...registerables);

@Component({
  selector: 'app-metricas-productos',
  standalone: true,
  imports: [CommonModule, UiIconComponent, UiInputComponent, UiHeaderComponent, FormsModule, UiBotonComponent, UitipografiaComponent],
  templateUrl: './metricas-productos.component.html',
})
export class MetricasProductosComponent implements OnInit, OnDestroy, AfterViewInit {
  private reportesService = inject(ReportesCotizacionesService);
  private cd = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  error: string | null = null;
  selectedMonth: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  topLimit: number = 10;
  productos: ProductoCotizadoDto[] = [];

  isDialogOpen = false;
  
  // Array de opciones para el select de top limit
  opcionesRango = [
    { value: 5, label: 'Top 5' },
    { value: 10, label: 'Top 10' },
    { value: 15, label: 'Top 15' },
    { value: 20, label: 'Top 20' },
  ];  
  
  toggleDialog() {
    this.isDialogOpen = !this.isDialogOpen;
  } 

  @ViewChild('productosChart', { static: false }) chartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngOnInit() {
    this.setCurrentMonth();
  }

  setCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    this.selectedMonth = `${year}-${month}`;
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

  // Nuevo método que solo calcula las fechas sin aplicar filtros
  calcularFechasDesdeMes() {
    this.calculateDatesFromMonth();
    // No llamamos a aplicarFiltros() aquí
  }

  ngAfterViewInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    if (this.chart) this.chart.destroy();
  }

  cargarDatos() {
    this.error = null;
    this.reportesService.getProductosMasCotizados(this.topLimit, this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.productos = response.data;
          this.cd.detectChanges();
          this.renderizarGrafica();
        }
      },
      error: (err) => {
        this.error = 'Error al cargar productos más cotizados';
        console.error(err);
      }
    });
  }

  aplicarFiltros() {
    // Solo aquí se destruye el gráfico y se cargan nuevos datos
    if (this.chart) this.chart.destroy();
    this.cargarDatos();
  }

  limpiarFiltros() {
    this.topLimit = 10;
    this.setCurrentMonth();
    this.aplicarFiltros(); // Aplica los filtros después de limpiar
  }

  private renderizarGrafica() {
    if (!this.productos.length || !this.chartRef) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.productos.map(p => p.nombreProducto || p.codigoProducto),
        datasets: [{
          label: 'Total Cotizaciones',
          data: this.productos.map(p => p.totalCotizaciones),
          backgroundColor: 'rgba(147, 51, 234, 0.7)',
          borderColor: 'rgba(147, 51, 234, 1)',
          borderWidth: 2
        }, {
          label: 'Cantidad Total',
          data: this.productos.map(p => p.cantidadTotal),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: { display: true, text: 'Cotizaciones' }
          },
          y1: {
            type: 'linear',
            position: 'top',
            title: { display: true, text: 'Cantidad' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  exportToExcel() {
    if (this.productos.length === 0) return;
    const filename = `Productos_Cotizados_${this.fechaInicio}_${this.fechaFin}`;
    this.exportService.exportToExcel(this.productos, filename, 'Productos Cotizados');
  }

  exportToPdf() {
    if (this.productos.length === 0) return;
    const filename = `Productos_Cotizados_${this.fechaInicio}_${this.fechaFin}`;
    const dateRangeStr = `${this.fechaInicio} al ${this.fechaFin}`;
    const columns = ['Producto', 'Código', 'Total Cotizaciones', 'Monto Total'];
    const rows = this.productos.map(p => [
      p.nombreProducto || 'N/A',
      p.codigoProducto || 'N/A',
      p.totalCotizaciones.toString(),
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.montoTotal)
    ]);
    this.exportService.exportToPdf(columns, rows, 'Productos Más Cotizados', filename, dateRangeStr);
  }
}