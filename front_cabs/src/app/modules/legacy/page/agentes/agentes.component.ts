import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgenteLegacyService } from '../../../../core/services/agente-legacy.service';
import { AgenteLegacyResponse } from '../../../../core/models/agente-legacy.interface';

// Importar componentes reutilizables
import { UiInputComponent } from '../../../../shared/molecules/input/input.component';
import { ConfiguracionColumna,  } from '../../../../shared/components/tabla-listado/tabla-listado.component';
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';

// Interface para la tabla
interface AgenteTabla {
  idAgente: number;
  codigoAgente: string;
  nombreAgente: string;
  tipoAgente: number;
  tipoAgenteStr: string;
  estatus: number;
  estatusStr: string;
  comisionStr: string;
  fechaAlta: string;
  fechaAltaFormateada: string;
}

@Component({
  selector: 'app-agentes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiIconComponent,
    UiInputComponent,
    UiHeaderComponent
  ],
  templateUrl: './agentes.component.html',
  styles: [`
    .back-button {
      display: inline-block;
      margin-bottom: 1rem;
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }
    .back-button:hover {
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentesComponent implements OnInit {
buscar // ✅ AGREGADO: Nueva paginación en cliente para usar con el componente reutilizable
() {
throw new Error('Method not implemented.');
}
agentesPaginadas() {
throw new Error('Method not implemented.');
}
  private agenteService = inject(AgenteLegacyService);

  // Señales para estado
  agentes = signal<AgenteTabla[]>([]);
  agentesOriginales = signal<AgenteTabla[]>([]); // ✅ AGREGADO: Para mantener copia original
  agentesFiltrados = signal<AgenteTabla[]>([]); // ✅ AGREGADO: Para datos filtrados
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Búsqueda
  searchQuery = signal<string>('');

  // Paginación del servidor
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalCount = signal<number>(0);
  hasPrevious = signal<boolean>(false);
  hasNext = signal<boolean>(false);

  // ✅ AGREGADO: Nueva paginación en cliente para usar con el componente reutilizable
  paginaActual = signal<number>(1);
  elementosPorPagina = signal<number>(10);

  // ✅ AGREGADO: Configuración para la paginación en el cliente
  configuracionPaginacion = {
    elementosPorPagina: 10,
    paginasVisiblesMaximas: 5,
    textoAnterior: 'Anterior',
    textoSiguiente: 'Siguiente',
    textoMostrandoRegistros: 'Mostrando',
    textoDeRegistros: 'de',
    mostrarInfoRegistros: true,
    mostrarBotonesPagina: true
  };

  // ✅ AGREGADO: Señales computadas para paginación en el cliente
  agentesPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina();
    const fin = inicio + this.elementosPorPagina();
    return this.agentesFiltrados().slice(inicio, fin);
  });

  totalElementos = computed(() => this.agentesFiltrados().length);

  // Configuración de columnas para tabla reutilizable
  columnas: ConfiguracionColumna<AgenteTabla>[] = [
    { encabezado: 'ID', campo: 'idAgente', alineacion: 'left' },
    { encabezado: 'Nombre', campo: 'nombreAgente', alineacion: 'left' },
    { encabezado: 'Tipo', campo: 'tipoAgenteStr', alineacion: 'left' },
    { encabezado: 'Estatus', campo: 'estatusStr', alineacion: 'left' },
    { encabezado: 'Fecha Alta', campo: 'fechaAltaFormateada', alineacion: 'left' },
  ];

  ngOnInit(): void {
    this.cargarAgentes();
  }

  cargarAgentes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.agenteService.getPaginated(this.currentPage(), 1000).subscribe({ // ✅ CAMBIO: Usamos 1000 para obtener todos los datos
      next: (response) => {
        const agentesTransformados = response.data.map(agente =>
          this.transformarAgenteParaTabla(agente)
        );

        this.agentes.set(agentesTransformados);
        this.agentesOriginales.set(agentesTransformados); // ✅ AGREGADO: Guardar copia completa
        this.agentesFiltrados.set(agentesTransformados); // ✅ AGREGADO: Inicializar filtrados

        // ✅ AGREGADO: Aplicar paginación inicial en cliente
        this.aplicarPaginacion();

        this.currentPage.set(response.pagination.currentPage);
        this.totalPages.set(response.pagination.totalPages);
        this.totalCount.set(response.pagination.totalCount);
        this.hasPrevious.set(response.pagination.hasPrevious);
        this.hasNext.set(response.pagination.hasNext);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar agentes:', err);
        this.error.set(err.message || 'Error al cargar agentes');
        this.loading.set(false);
      }
    });
  }

  // ✅ AGREGADO: Método para aplicar paginación en cliente
  aplicarPaginacion(): void {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina();
    const fin = inicio + this.elementosPorPagina();
    const agentesPaginados = this.agentesFiltrados().slice(inicio, fin);
    this.agentes.set(agentesPaginados);
  }

  // ✅ AGREGADO: Método para cambio de página en cliente
  onCambioPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.aplicarPaginacion();
  }

  buscarAgentes(): void {
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      // Si no hay búsqueda, mostrar todos los agentes
      this.agentesFiltrados.set([...this.agentesOriginales()]);
    } else {
      // Filtrar localmente por nombre o código
      const filtrados = this.agentesOriginales().filter(agente =>
        agente.nombreAgente.toLowerCase().includes(query) ||
        agente.codigoAgente.toLowerCase().includes(query)
      );

      this.agentesFiltrados.set(filtrados);
    }

    // Resetear a primera página al filtrar
    this.paginaActual.set(1);
    this.aplicarPaginacion();
  }

  limpiarBusqueda(): void {
    this.searchQuery.set('');
    this.buscarAgentes();
  }

  // Método para cambio de página del servidor (mantenido por compatibilidad)
  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      if (this.searchQuery().trim()) {
        this.buscarAgentes();
      } else {
        this.cargarAgentes();
      }
    }
  }

  // Transformar datos del API para la tabla
  transformarAgenteParaTabla(agente: AgenteLegacyResponse): AgenteTabla {
    return {
      ...agente,
      tipoAgenteStr: this.getTipoAgenteLabel(agente.tipoAgente),
      estatusStr: agente.estatus === 1 ? 'Activo' : 'Inactivo',
      fechaAltaFormateada: this.formatDate(agente.fechaAlta),
      comisionStr: `${agente.comisionVenta}%`
    };
  }

  getTipoAgenteLabel(tipo: number): string {
    switch (tipo) {
      case 1: return 'Venta';
      case 2: return 'Cobro';
      default: return 'Otro';
    }
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  // Acciones de la tabla
  onFilaClick(agente: AgenteTabla): void {
    console.log('Agente seleccionado:', agente);
    this.verDetalleAgente(agente);
  }

  verDetalleAgente(agente: AgenteTabla): void {
    console.log('Ver detalle de agente:', agente);
    // Implementa la navegación o modal de detalle aquí
  }

  editarAgente(agente: AgenteTabla): void {
    console.log('Editar agente:', agente);
    // Implementa la lógica para editar aquí
  }

  abrirModalNuevoAgente(): void {
    console.log('Abrir modal de nuevo agente');
    // Implementa la lógica para abrir modal de creación
  }
// Agregar Math al componente para usarlo en el template
Math = Math;

// Método para obtener el ancho de cada columna
getColumnaWidth(campo: string): string {
  switch (campo) {
    case 'idAgente': return '100px';
    case 'codigoAgente': return '150px';
    case 'nombreAgente': return '200px';
    case 'tipoAgenteStr': return '100px';
    case 'estatusStr': return '100px';
    case 'fechaAltaFormateada': return '120px';
    default: return 'auto';
  }
}

// Calcular total de páginas
totalPaginas = computed(() => Math.ceil(this.totalElementos() / this.elementosPorPagina()));

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
