import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportesCotizacionesService } from '../../../../../core/services/reportes-cotizaciones.service';
import { ExportService } from '../../../../../core/services/export.service';
import { CotizacionPorRangoDto } from '../../../../../core/models/reportes-cotizaciones.interface';
import { UiHeaderTabsComponent } from "../../../../../shared/molecules/headerTab/headerTab.component";
import { UitipografiaComponent } from "../../../../../shared/~exports/detail-view.index";
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-rangos-monto',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconComponent, UiHeaderComponent, UiBotonComponent, UitipografiaComponent],
  templateUrl: './rangos-monto.component.html',
})
export class RangosMontoComponent implements OnInit, OnDestroy, AfterViewInit {
  private reportesService = inject(ReportesCotizacionesService);
  private cd = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  error: string | null = null;
  selectedMonth: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  rangos: CotizacionPorRangoDto[] = [];

  isDialogOpen = false;
  @ViewChild('rangosChart', { static: false }) chartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  toggleDialog() {
    this.isDialogOpen = !this.isDialogOpen;
  }  

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
    this.reportesService.getCotizacionesPorRangoMonto(this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.rangos = response.data;
          this.cd.detectChanges();
          this.renderizarGrafica();
        }
      },
      error: (err) => {
        this.error = 'Error al cargar rangos de monto';
        console.error(err);
      }
    });
  }

  aplicarFiltros() {
    if (this.chart) this.chart.destroy();
    this.cargarDatos();
  }

  limpiarFiltros() {
    this.setCurrentMonth();
    this.aplicarFiltros(); // Aplica los filtros después de limpiar
  }

  private renderizarGrafica() {
    if (!this.rangos.length || !this.chartRef) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    const colors = [
      'rgba(59, 130, 246, 0.7)',
      'rgba(16, 185, 129, 0.7)',
      'rgba(245, 158, 11, 0.7)',
      'rgba(239, 68, 68, 0.7)',
      'rgba(147, 51, 234, 0.7)',
      'rgba(236, 72, 153, 0.7)'
    ];

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.rangos.map(r => r.rangoMonto),
        datasets: [{
          data: this.rangos.map(r => r.totalCotizaciones),
          backgroundColor: colors.slice(0, this.rangos.length),
          borderColor: colors.slice(0, this.rangos.length).map(c => c.replace('0.7', '1')),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { padding: 15 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const rango = this.rangos[context.dataIndex];
                return [
                  `${context.label}: ${context.parsed}`,
                  `Monto Total: $${rango.montoTotal.toFixed(2)}`,
                  `Porcentaje: ${rango.porcentajeDelTotal.toFixed(1)}%`
                ];
              }
            }
          }
        }
      }
    });
  }

  get totalCotizaciones(): number {
    return this.rangos.reduce((sum, r) => sum + r.totalCotizaciones, 0);
  }

  get totalMonto(): number {
    return this.rangos.reduce((sum, r) => sum + r.montoTotal, 0);
  }

  exportToExcel() {
    if (this.rangos.length === 0) return;
    const filename = `Rangos_Monto_${this.fechaInicio}_${this.fechaFin}`;
    this.exportService.exportToExcel(this.rangos, filename, 'Rangos de Monto');
  }

  exportToPdf() {
    if (this.rangos.length === 0) return;
    const filename = `Rangos_Monto_${this.fechaInicio}_${this.fechaFin}`;
    const dateRangeStr = `${this.fechaInicio} al ${this.fechaFin}`;
    const columns = ['Rango', 'Total Cotizaciones', 'Monto Total', 'Porcentaje'];
    const rows = this.rangos.map(r => [
      r.rangoMonto,
      r.totalCotizaciones.toString(),
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.montoTotal),
      `${r.porcentajeDelTotal.toFixed(1)}%`
    ]);
    this.exportService.exportToPdf(columns, rows, 'Cotizaciones por Rango de Monto', filename, dateRangeStr);
  }
}