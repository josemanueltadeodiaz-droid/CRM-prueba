import { Component, OnInit, signal, inject, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteLegacyService } from '../../../../core/services/cliente-legacy.service';
import { ClienteLegacyResponse, ClienteLegacyPaginado } from '../../../../core/models/cliente-legacy.interface';
import { DialogClientesComponent } from './dialog-clientes/dialog-clientes.component';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

// Componentes reutilizables
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { UiInputComponent, SelectOption } from "../../../../shared/~exports/filter-system.index";
import { UiBotonComponent } from '../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-clientes-legacy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogClientesComponent,
    UiIconComponent,
    UiHeaderComponent,
    UiInputComponent,
    UiBotonComponent
  ],
  templateUrl: './clientes-legacy.component.html',
  styleUrl: './clientes-legacy.component.css'
})
export class ClientesLegacyComponent implements OnInit {
  private clienteService = inject(ClienteLegacyService);
  private searchSubject = new Subject<string>();

  // Signals
  clientes = signal<ClienteLegacyResponse[]>([]);
  loading = signal<boolean>(false);
  pagination = signal<ClienteLegacyPaginado['pagination'] | null>(null);
  selectedClienteId = signal<number | null>(null);
  
  // Señales de estado para el UI
  mostrarEsqueleto = signal<boolean>(true);
  monstrarDatos = signal<boolean>(false);
  errorDeConexion = signal<boolean>(true);
  sinDatos = signal<boolean>(false);

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  totalRecords = signal<number>(0);
  totalPages = signal<number>(1);

  // Templates para columnas personalizadas
  @ViewChild('nombreTemplate') nombreTemplate!: TemplateRef<any>;
  @ViewChild('ubicacionTemplate') ubicacionTemplate!: TemplateRef<any>;

  // Filtros
  searchTerm: string = '';

  Math = Math;

  constructor() {}

  ngOnInit(): void {
    this.cargarClientes();
    this.setupSearchDebounce();
  }


  /**
   * Configura el debounce para la búsqueda automática
   */
  setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.cargarClientes(1);
    });
  }

  /**
   * Método para cuando cambia el término de búsqueda
   */
  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }


  /**
   * Método para evento enter o click de búsqueda
   */
  buscar(): void {
    this.cargarClientes(1);
  }

  /**
   * Limpia los filtros de búsqueda y recarga los datos
   */
  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.cargarClientes(1);
  }

  /**
   * Recarga los datos con los filtros actuales
   */
  recargarConFiltros(): void {
    this.cargarClientes(1);
  }

  /**
   * Cambia la página actual
   */
  cambiarPagina(page: number): void {
    this.cargarClientes(page);
  }

  cambiarPaginaAnterior(): void {
    if (this.pagination()?.currentPage && this.pagination()!.currentPage > 1) {
      this.cargarClientes(this.pagination()!.currentPage - 1);
    }
  }

  cambiarPaginaSiguiente(): void {
    if (this.pagination()?.currentPage && this.pagination()!.currentPage < this.pagination()!.totalPages) {
      this.cargarClientes(this.pagination()!.currentPage + 1);
    }
  }

  cambiarTamanoPagina(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    this.pageSize.set(newSize);
    this.cargarClientes(1);
  }

  /**
   * Resetea todos los estados antes de cargar
   */
  private resetEstados(): void {
    this.mostrarEsqueleto.set(true);
    this.monstrarDatos.set(false);
    this.errorDeConexion.set(false);
    this.sinDatos.set(false);
    this.loading.set(true);
  }

  /**
   * Carga los clientes con los filtros aplicados
   */
  cargarClientes(page: number = 1): void {
    this.resetEstados();

    const filtros = {
      numeroPagina: page,
      tamanoPagina: this.pageSize(),
      razonSocial: this.searchTerm.trim() || undefined,
      estatus: 1,
      incluirDetalleUbicacion: true
    };

    console.log('Cargando clientes con filtros:', filtros);

    this.clienteService.buscarPaginado(filtros).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const clientesData = response.data.data;
          const paginationData = response.data.pagination;
          
          this.clientes.set(clientesData);
          this.pagination.set(paginationData);
          this.totalRecords.set(paginationData.totalRecords);
          this.totalPages.set(paginationData.totalPages);
          this.currentPage.set(paginationData.currentPage);
          
          // Gestionar estados según los datos recibidos
          if (clientesData.length === 0) {
            this.sinDatos.set(true);
            this.monstrarDatos.set(false);
          } else {
            this.monstrarDatos.set(true);
            this.sinDatos.set(false);
          }
          
          this.mostrarEsqueleto.set(false);
          this.errorDeConexion.set(false);
          
          console.log('Clientes cargados:', clientesData.length);
        } else {
          this.sinDatos.set(true);
          this.mostrarEsqueleto.set(false);
          this.monstrarDatos.set(false);
        }
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.loading.set(false);
        this.mostrarEsqueleto.set(false);
        this.monstrarDatos.set(false);
        this.errorDeConexion.set(true);
        this.sinDatos.set(false);
      }
    });
  }

  /**
   * Abre el diálogo de detalles del cliente
   */
  verDetalles(clienteId: number): void {
    console.log('Abriendo detalles del cliente:', clienteId);
    this.selectedClienteId.set(clienteId);
  }

  /**
   * Cierra el diálogo de detalles
   */
  cerrarDialog(): void {
    console.log('Cerrando dialog');
    this.selectedClienteId.set(null);
  }

  /**
   * Obtiene la dirección completa formateada del cliente
   */
  getDireccionCompleta(cliente: ClienteLegacyResponse): { calle: string, colonia?: string, ciudad: string } | null {
    if (cliente.ubicacionDetalle) {
      const det = cliente.ubicacionDetalle;
      return {
        calle: `${det.calle} ${det.numeroExterior} ${det.numeroInterior ? 'Int. ' + det.numeroInterior : ''}`.trim(),
        colonia: det.colonia || undefined,
        ciudad: `${det.ciudad || ''}, ${det.estado || ''}`.trim()
      };
    }

    if (cliente.ubicacion) {
      return {
        calle: cliente.ubicacion,
        colonia: undefined,
        ciudad: cliente.estado || ''
      };
    }

    return null;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }
}