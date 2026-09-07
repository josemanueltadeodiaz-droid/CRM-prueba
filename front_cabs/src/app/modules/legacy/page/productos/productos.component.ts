import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoLegacyService } from '../../../../core/services/producto-legacy.service';
import { ProductoLegacyResponse, ProductoLegacyPaginado } from '../../../../core/models/producto-legacy.interface';
import { DialogProductosComponent } from './dialog-productos/dialog-productos.component';
import { ConfiguracionPaginacion } from '../../../../shared/components/paginacion/paginacion.component';
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { UiInputComponent, SelectOption } from "../../../../shared/~exports/filter-system.index";
import { UiBotonComponent } from '../../../../shared/~exports/detail-view.index';
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogProductosComponent,
    UiHeaderComponent,
    UiInputComponent,
    UiBotonComponent,
    UiIconComponent
  ],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  // Opciones para el selector de estado (CORREGIDO)
  estadoOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
  ];

  // Variables de estado 
  searchTerm: string = '';
  statusFilter: string = 'todos'; // Cambiado de 'null' a 'todos'
  statusFilterLegacy: string = 'null'; // Para el select nativo si lo usas

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  totalRecords = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize()));

  private productoService = inject(ProductoLegacyService);

  // Señales de estado 
  mostrarEsqueleto = signal<boolean>(true);
  monstrarDatos = signal<boolean>(false);
  errorDeConexion = signal<boolean>(false);
  sinDatos = signal<boolean>(false);

  productos = signal<ProductoLegacyResponse[]>([]);
  loading = signal<boolean>(false);
  pagination = signal<ProductoLegacyPaginado['pagination'] | null>(null);
  selectedProductId = signal<number | null>(null);
  
  Math = Math;

  // ✅ Configuración reutilizable
  configuracionPaginacion: ConfiguracionPaginacion = {
    elementosPorPagina: 50,
    paginasVisiblesMaximas: 5,
    textoAnterior: 'Anterior',
    textoSiguiente: 'Siguiente',
    mostrarInfoRegistros: true,
    mostrarBotonesPagina: true
  };

  ngOnInit(): void {
    this.cargarProductos();
  }

  // Método para manejar cambios en el buscador (NUEVO)
  onSearchTermChange(value: string): void {
    this.searchTerm = value;
  }

  // Método para filtrar por estado (CORREGIDO)
  cambiarFiltroEstado(): void {
    console.log('Filtro cambiado a:', this.statusFilter);
    this.cargarProductos(1);
  }

  // Método para filtrar por estado con select nativo (NUEVO)
  cambiarFiltroEstadoLegacy(): void {
    console.log('Filtro legacy cambiado a:', this.statusFilterLegacy);
    this.cargarProductos(1);
  }

  // Métodos de paginación
  cambiarPagina(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.cargarProductos();
  }

  cambiarPaginaAnterior(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.cargarProductos();
    }
  }

  cambiarPaginaSiguiente(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.cargarProductos();
    }
  }

  cambiarTamanoPagina(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.currentPage.set(1);
    this.cargarProductos();
  }

  buscar(): void {
    this.cargarProductos(1);
  }
  


cargarProductos(page: number = 1): void {
  // Resetear estados
  this.mostrarEsqueleto.set(true);
  this.monstrarDatos.set(false);
  this.errorDeConexion.set(false);
  this.sinDatos.set(false);
  this.loading.set(true);

  // CORREGIDO: Mapeo de valores para el filtro
  let statusValue: number | null = null;
  
  // Para el componente personalizado
  if (this.statusFilter === 'activo') statusValue = 1;
  else if (this.statusFilter === 'inactivo') statusValue = 0;
  else if (this.statusFilter === 'pendiente') statusValue = 2; // Ajusta según tu lógica

  const filtros = {
    page,
    pageSize: this.pageSize(), // CORREGIDO: Usar pageSize de la señal
    nombreProducto: this.searchTerm.trim() || undefined,
    status: statusValue
  };

  this.productoService.buscarPaginado(filtros).subscribe({
    next: (response) => {
      if (response.success && response.data) {
        const productosData = response.data.data;
        const paginationData = response.data.pagination;
        
        this.productos.set(productosData);
        this.pagination.set(paginationData);
        this.totalRecords.set(paginationData.totalRecords);
        
        // Gestionar estados según los datos recibidos
        if (productosData.length === 0) {
          this.sinDatos.set(true);
          this.monstrarDatos.set(false);
          this.sinDatos.set(true);

        } else {
          this.monstrarDatos.set(true);
          this.sinDatos.set(false);
          this.errorDeConexion.set(true);
        }
        
        this.mostrarEsqueleto.set(false);
        this.errorDeConexion.set(false);
      } else {
        // Si la respuesta no es exitosa pero no hay error de conexión
        this.sinDatos.set(true);
        this.mostrarEsqueleto.set(false);
        this.monstrarDatos.set(false);
      }
      
      this.loading.set(false);
    },
    error: (error) => {
      console.error('Error al cargar productos:', error);
      this.loading.set(false);
      this.mostrarEsqueleto.set(false);
      this.monstrarDatos.set(false);
      this.errorDeConexion.set(true);
      this.sinDatos.set(false);
    }
  });
}

// Método adicional para limpiar estados al cambiar filtros
resetEstados(): void {
  this.mostrarEsqueleto.set(true);
  this.monstrarDatos.set(false);
  this.errorDeConexion.set(false);
  this.sinDatos.set(false);
  this.loading.set(true);
}

// Método para recargar con nuevos filtros
recargarConFiltros(): void {
  this.resetEstados();
  this.cargarProductos(1); // Reset a primera página
}


  // BOTÓN LIMPIAR FUNCIONAL (CORREGIDO)
  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.statusFilter = 'todos';
    this.statusFilterLegacy = 'null';
    this.cargarProductos(1);
  }

  verDetalles(productoId: number): void {
    this.selectedProductId.set(productoId);
  }

  cerrarDialog(): void {
    this.selectedProductId.set(null);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(value);
  }
}