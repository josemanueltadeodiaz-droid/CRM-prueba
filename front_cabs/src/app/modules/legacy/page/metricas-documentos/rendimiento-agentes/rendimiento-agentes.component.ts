import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportesCotizacionesService } from '../../../../../core/services/reportes-cotizaciones.service';
import { ExportService } from '../../../../../core/services/export.service';
import { RendimientoAgenteDto } from '../../../../../core/models/reportes-cotizaciones.interface';
import { UitipografiaComponent } from "../../../../../shared/~exports/detail-view.index";
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';

Chart.register(...registerables);

@Component({
  selector: 'app-rendimiento-agentes',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconComponent, UiBotonComponent, UitipografiaComponent, UiHeaderComponent],
  templateUrl: './rendimiento-agentes.component.html',
})
export class RendimientoAgentesComponent implements OnInit, OnDestroy, AfterViewInit {
  private reportesService = inject(ReportesCotizacionesService);
  private cd = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  error: string | null = null;
  selectedMonth: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  agentes: RendimientoAgenteDto[] = [];

  isDialogOpen = false;
  @ViewChild('agentesChart', { static: false }) chartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngOnInit() {
    this.setCurrentMonth();
    this.calculateDatesFromMonth(); // Calcular fechas iniciales
  }

  toggleDialog() {
    this.isDialogOpen = !this.isDialogOpen;
  }

  setCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    this.selectedMonth = `${year}-${month}`;
  }

  calculateDatesFromMonth() {
    if (!this.selectedMonth) return;
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    this.fechaInicio = firstDay.toISOString().split('T')[0];
    this.fechaFin = lastDay.toISOString().split('T')[0];
  }

  // Solo actualiza las fechas, NO aplica filtros
  onMonthChange() {
    this.calculateDatesFromMonth();
    // NO llamamos a aplicarFiltros() aquí
  }

  ngAfterViewInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    if (this.chart) this.chart.destroy();
  }

  cargarDatos() {
    this.error = null;
    this.reportesService.getRendimientoAgentes(this.fechaInicio, this.fechaFin).subscribe({
      next: (response) => {
        if (response.success) {
          this.agentes = response.data;
          this.cd.detectChanges();
          this.renderizarGrafica();
        }
      },
      error: (err) => {
        this.error = 'Error al cargar rendimiento de agentes';
        console.error(err);
      }
    });
  }

  aplicarFiltros() {
    // Asegurarse de que las fechas estén calculadas
    this.calculateDatesFromMonth();
    
    // Destruir gráfica anterior y cargar nuevos datos
    if (this.chart) this.chart.destroy();
    this.cargarDatos();
  }

  limpiarFiltros() {
    this.setCurrentMonth();
    this.calculateDatesFromMonth();
    
    // Destruir gráfica anterior y cargar nuevos datos
    if (this.chart) this.chart.destroy();
    this.cargarDatos();
  }

  private renderizarGrafica() {
    if (!this.agentes.length || !this.chartRef) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.agentes.map(a => a.nombreAgente),
        datasets: [{
          label: 'Cotizaciones Activas',
          data: this.agentes.map(a => a.cotizacionesActivas || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2
        }, {
          label: 'Cotizaciones Canceladas',
          data: this.agentes.map(a => a.cotizacionesCanceladas || 0),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              footer: (context) => {
                const index = context[0].dataIndex;
                const tasa = this.agentes[index].tasaConversion;
                return `Tasa Conversión: ${tasa.toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Cantidad de Cotizaciones' }
          }
        }
      }
    });
  }

  exportToExcel() {
    const data = this.agentes.map(agente => ({
      'Agente': agente.nombreAgente,
      'Cotizaciones Activas': agente.cotizacionesActivas || 0,
      'Cotizaciones Canceladas': agente.cotizacionesCanceladas || 0,
      'Tasa de Conversión (%)': agente.tasaConversion.toFixed(1)
    }));

    this.exportService.exportToExcel(
      data,
      `rendimiento-agentes_${this.fechaInicio}_to_${this.fechaFin}`,
      'Rendimiento de Agentes'
    );
  }

  exportToPdf() {
    const headers = ['Agente', 'Cotizaciones Activas', 'Cotizaciones Canceladas', 'Tasa de Conversión (%)'];
    const data = this.agentes.map(agente => [
      agente.nombreAgente,
      (agente.cotizacionesActivas || 0).toString(),
      (agente.cotizacionesCanceladas || 0).toString(),
      agente.tasaConversion.toFixed(1) + '%'
    ]);

    this.exportService.exportToPdf(
      headers,
      data,
      `Rendimiento de Agentes - ${this.fechaInicio} a ${this.fechaFin}`,
      'Rendimiento de Agentes'
    );
  }
}