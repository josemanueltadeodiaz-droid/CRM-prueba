import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonedaLegacyService } from '../../../../core/services/moneda-legacy.service';
import { MonedaLegacyResponse, MonedaLegacyPaginatedResponse } from '../../../../core/models/moneda-legacy.interface';

// Importar componentes reutilizables
import { ConfiguracionColumna } from '../../../../shared/components/tabla-listado/tabla-listado.component';
import { UiInputComponent as UiInputComponent_1 } from "../../../../shared/molecules/input/input.component";
import { UiInputComponent as UiInputComponent } from "../../../../shared/~exports/filter-system.index";
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { UiBotonComponent } from '../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-monedas',
  standalone: true,
  imports: [
    CommonModule,
    UiInputComponent,
    UiInputComponent_1,
    UiIconComponent,
    UiHeaderComponent,
    UiBotonComponent
  ],
  templateUrl: './monedas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonedasComponent implements OnInit {
  private monedaService = inject(MonedaLegacyService);

  // Señales para estado
  monedas = signal<MonedaLegacyResponse[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Búsqueda
  terminoBusqueda = signal<string>('');

  // Paginación del servidor
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalCount = signal<number>(0);
  hasPrevious = signal<boolean>(false);
  hasNext = signal<boolean>(false);

  // Señal para manejar datos filtrados localmente
  monedasFiltradas = signal<MonedaLegacyResponse[]>([]);


  // Señales computadas para paginación en el cliente
  paginaActual = signal<number>(1);
  elementosPorPagina = signal<number>(10);

  monedasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina();
    const fin = inicio + this.elementosPorPagina();
    return this.monedasFiltradas().slice(inicio, fin);
  });

  totalElementos = computed(() => this.monedasFiltradas().length);
  
  totalPaginas = computed(() => Math.ceil(this.totalElementos() / this.elementosPorPagina()));

  // Math para usar en el template
  Math = Math;

  // Configuración de columnas para la tabla (AHORA ES PÚBLICO)
  columnas: ConfiguracionColumna<MonedaLegacyResponse>[] = [
    {
      encabezado: 'ID',
      campo: 'idMoneda',
      ancho: '100px',
      alineacion: 'center'
    },
    {
      encabezado: 'Nombre',
      campo: 'nombreMoneda',
      ancho: '200px',
      alineacion: 'left'
    },
    {
      encabezado: 'Símbolo',
      campo: 'simboloMoneda',
      ancho: '120px',
      alineacion: 'center'
    },
    {
      encabezado: 'Posición',
      campo: 'posicionSimbolo',
      ancho: '120px',
      alineacion: 'center'
    },
    {
      encabezado: 'Decimales',
      campo: 'numeroDecimales',
      ancho: '120px',
      alineacion: 'center'
    },
    {
      encabezado: 'Última Modificación',
      campo: 'timestamp',
      ancho: '180px',
      alineacion: 'center'
    }
  ];

  ngOnInit(): void {
    this.cargarMonedas();
  }

  cargarMonedas(): void {
    this.loading.set(true);
    this.error.set(null);

    this.monedaService.getPaginated(this.currentPage(), 20).subscribe({
      next: (response: MonedaLegacyPaginatedResponse) => {
        this.monedas.set(response.data);
        this.monedasFiltradas.set(response.data);
        this.currentPage.set(response.pagination.currentPage);
        this.totalPages.set(response.pagination.totalPages);
        this.totalCount.set(response.pagination.totalCount);
        this.hasPrevious.set(response.pagination.hasPrevious);
        this.hasNext.set(response.pagination.hasNext);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar monedas:', err);
        this.error.set(err.message || 'Error al cargar monedas');
        this.loading.set(false);
      }
    });
  }

  // Método para filtrar monedas localmente
  filtrarMonedas(): void {
    const busqueda = this.terminoBusqueda().toLowerCase();

    if (!busqueda) {
      this.monedasFiltradas.set([...this.monedas()]);
    } else {
      const filtradas = this.monedas().filter(moneda =>
        moneda.nombreMoneda.toLowerCase().includes(busqueda) ||
        moneda.simboloMoneda.toLowerCase().includes(busqueda) ||
        moneda.idMoneda.toString().includes(busqueda)
      );

      this.monedasFiltradas.set(filtradas);
    }

    this.paginaActual.set(1);
  }

  // Método para cambio de página en el cliente
  onCambioPagina(pagina: number): void {
    this.paginaActual.set(pagina);
  }

  // Método para cambio de página del servidor
  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.cargarMonedas();
    }
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  // Método para manejar clics en filas
  onFilaClick(moneda: MonedaLegacyResponse): void {
    console.log('Moneda seleccionada:', moneda);
  }

  // Método para crear moneda
  abrirModalCrearMoneda(): void {
    console.log('Abrir modal para crear moneda');
  }

  // Métodos para el footer de paginación
  cambiarPaginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.paginaActual.set(this.paginaActual() - 1);
    }
  }

  cambiarPaginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) {
      this.paginaActual.set(this.paginaActual() + 1);
    }
  }

  cambiarTamanoPagina(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nuevoTamano = Number(select.value);
    this.elementosPorPagina.set(nuevoTamano);
    this.paginaActual.set(1);
  }
}