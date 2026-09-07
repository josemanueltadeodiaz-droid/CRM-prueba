import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// UI
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';
import { UiCardComponent } from '../../../../shared/molecules/card/card.component';
import { DialogVistaMisOrdenesServicios } from './dialog-vista-misOrdenesServicio/dialog.vista-misOrdenesServicio.component';
import { UiBotonComponent } from '../../../../shared/~exports/detail-view.index';
import { UitipografiaComponent } from '../../../../shared/~exports/detail-view.index';

// Services
import {
  OrdenServicioPruebasService,
  OrdenServicioPruebaItem,
  OrdenServicioPruebasResumen,
  OrdenServicioPruebasListParams,
} from '../../../../core/services/orden-servicio.servicePrueba';
import { AgenteLegacyService } from '../../../../core/services/agente-legacy.service';

@Component({
  selector: 'app-mis-asignaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UiHeaderComponent,
    UiIconComponent,
    UiCardComponent,
    DialogVistaMisOrdenesServicios,
    UiBotonComponent,
    UitipografiaComponent,
  ],
  templateUrl: './misOrdenesServicio.component.html',
})
export class MisAsignacionesComponent implements OnInit {
  Math = Math;

  private ordenesPruebaService = inject(OrdenServicioPruebasService);
  private agenteService        = inject(AgenteLegacyService);

  visualizarDetallesModal = signal<boolean>(false);
  ordenSeleccionada       = signal<OrdenServicioPruebaItem | null>(null);

  datos         = signal<OrdenServicioPruebaItem[]>([]);
  cargandoDatos = signal<boolean>(false);
  errorDatos    = signal<boolean>(false);

  // Paginación (server-side)
  currentPage = signal<number>(1);
  pageSize    = signal<number>(10);
  private totalItemsServer = signal<number>(0);
  private totalPagesServer = signal<number>(0);

  private agentesMap = signal<Record<number, string>>({});

  // Filtros
  filtroFolio           = '';
  filtroEstado          = '';
  filtroAgentePrincipal = '';
  filtroAgenteAuxiliar  = '';
  filtroFechaInicio     = '';
  filtroFechaFin        = '';

  agentesLista = computed(() => {
    const map = this.agentesMap();
    return Object.entries(map).map(([id, nombre]) => ({
      id: Number(id),
      nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  // KPIs
  private resumenGlobal = signal<OrdenServicioPruebasResumen>({
    totalOrdenes: 0, ordenesEnEspera: 0, ordenesEnProceso: 0, ordenesTerminadas: 0
  });

  totalOrdenes      = computed(() => this.resumenGlobal().totalOrdenes);
  ordenesEnEspera   = computed(() => this.resumenGlobal().ordenesEnEspera);
  ordenesEnProceso  = computed(() => this.resumenGlobal().ordenesEnProceso);
  ordenesTerminadas = computed(() => this.resumenGlobal().ordenesTerminadas);

  datosFiltrados          = computed(() => this.datos());
  datosFiltradosPaginados = computed(() => this.datos());
  totalFiltradosRecords   = computed(() => this.totalItemsServer());
  totalFiltradosPages     = computed(() => this.totalPagesServer());

  ngOnInit() {
    this.cargarCatalogoAgentesYOrdenes();
  }

  private cargarCatalogoAgentesYOrdenes(): void {
    this.cargandoDatos.set(true);
    this.errorDatos.set(false);

    this.agenteService.getAllAgentesMap().subscribe({
      next: (map) => {
        this.agentesMap.set(map);
        this.cargarOrdenes();
      },
      error: () => this.cargarOrdenes()
    });
  }

  cargarOrdenes(): void {
    this.cargandoDatos.set(true);
    this.errorDatos.set(false);

    const params: OrdenServicioPruebasListParams = {
      page:     this.currentPage(),
      pageSize: this.pageSize(),
    };

    const folio = this.filtroFolio.trim();
    if (folio) params.folio = folio;

    if (this.filtroEstado) params.estadoOrden = this.filtroEstado;

    const agentePrincipal = Number(this.filtroAgentePrincipal);
    if (agentePrincipal > 0) params.agentePrincipalId = agentePrincipal;

    const agenteAuxiliar = Number(this.filtroAgenteAuxiliar);
    if (agenteAuxiliar > 0) params.agenteAuxiliarId = agenteAuxiliar;

    if (this.filtroFechaInicio) params.fechaInicio = this.toApiDate(this.filtroFechaInicio);
    if (this.filtroFechaFin)    params.fechaFin    = this.toApiDate(this.filtroFechaFin);

    this.ordenesPruebaService.getOrdenesServicioPruebas(params).subscribe({
      next: (response) => {
        this.datos.set(response.items || []);
        this.resumenGlobal.set(response.resumenGlobal || {
          totalOrdenes: 0, ordenesEnEspera: 0, ordenesEnProceso: 0, ordenesTerminadas: 0
        });
        this.totalItemsServer.set(response.totalItems || 0);
        this.totalPagesServer.set(response.totalPages || 0);
        this.cargandoDatos.set(false);
      },
      error: (error) => {
        console.error('❌ Error al cargar órdenes:', error);
        this.errorDatos.set(true);
        this.cargandoDatos.set(false);
      }
    });
  }

  private toApiDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  aplicarFiltros(): void {
    this.currentPage.set(1);
    this.cargarOrdenes();
  }

  limpiarFiltros(): void {
    this.filtroFolio           = '';
    this.filtroEstado          = '';
    this.filtroAgentePrincipal = '';
    this.filtroAgenteAuxiliar  = '';
    this.filtroFechaInicio     = '';
    this.filtroFechaFin        = '';
    this.currentPage.set(1);
    this.cargarOrdenes();
  }

  cambiarPaginaAnterior(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.cargarOrdenes();
    }
  }

  cambiarPaginaSiguiente(): void {
    if (this.currentPage() < this.totalFiltradosPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.cargarOrdenes();
    }
  }

  cambiarTamanoPagina(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.cargarOrdenes();
  }

  getNombresAuxiliaresTexto(auxiliares: { nombre: string; iniciales: string }[]): string {
    return auxiliares.map(a => a.nombre).join(', ');
  }

  abrirDetalle(orden: OrdenServicioPruebaItem): void {
    this.ordenSeleccionada.set(orden);
    this.visualizarDetallesModal.set(true);
  }

  cerrarDetalle(): void {
    this.visualizarDetallesModal.set(false);
    setTimeout(() => this.ordenSeleccionada.set(null), 300);
  }

  getFolio(orden: OrdenServicioPruebaItem): string {
    return `ORD-${(orden.documentoId ?? 0).toString().padStart(6, '0')}`;
  }

  getNombreAgentePrincipal(orden: OrdenServicioPruebaItem): string {
    const raw: unknown = orden.idAgentePrincipal ?? orden.agentePrincipal;
    const id = Number(raw);
    if (id > 0) {
      return this.agentesMap()[id] || `Agente #${id}`;
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    return 'Sin agente asignado';
  }

  getNombresAgentesAuxiliares(agenteAuxiliar: string | null | undefined): { nombre: string; iniciales: string }[] {
    if (!agenteAuxiliar) return [];
    const map = this.agentesMap();
    return agenteAuxiliar
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
      .map(token => {
        const id = Number(token);
        if (!isNaN(id) && id > 0) {
          const nombre = map[id] || `Agente #${id}`;
          return { nombre, iniciales: this.getIniciales(nombre) };
        }
        const nombre = token;
        return { nombre, iniciales: this.getIniciales(nombre) };
      });
  }

  getIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  getColorAvatar(nombre: string): string {
    const colores = [
      'bg-blue-500',   'bg-indigo-500', 'bg-purple-500',
      'bg-pink-500',   'bg-rose-500',   'bg-orange-500',
      'bg-amber-500',  'bg-teal-500',   'bg-cyan-500',
      'bg-emerald-500'
    ];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  getEstadoClase(estado: string | undefined): string {
    const e = (estado || '').toUpperCase();
    const map: Record<string, string> = {
      ABIERTA:    'bg-blue-100 text-blue-700',
      ASIGNADA:   'bg-purple-100 text-purple-700',
      EN_CURSO:   'bg-orange-100 text-orange-700',
      EN_PROCESO: 'bg-orange-100 text-orange-700',
      CERRADA:    'bg-green-100 text-green-700',
      FINALIZADO: 'bg-green-100 text-green-700',
      CANCELADA:  'bg-red-100 text-red-700',
      PENDIENTE:  'bg-amber-100 text-amber-700',
    };
    return map[e] || 'bg-gray-100 text-gray-700';
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.toTitleCase((estado || 'SIN_ESTADO').replaceAll('_', ' ').toLowerCase());
  }

  getEstadoFacturaTexto(v: string | undefined): string {
    const e = (v || 'PENDIENTE').toUpperCase();
    if (e === 'CONFACTURA')  return 'Con factura';
    if (e === 'SIN_FACTURA') return 'Sin factura';
    return this.toTitleCase(e.replaceAll('_', ' ').toLowerCase());
  }

  getEstadoFacturaClase(v: string | undefined): string {
    const e = (v || 'PENDIENTE').toUpperCase();
    if (e === 'CONFACTURA')  return 'bg-emerald-100 text-emerald-700';
    if (e === 'SIN_FACTURA') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).replace('.', '');
  }

  private toTitleCase(value: string): string {
    return value.split(' ').filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
}