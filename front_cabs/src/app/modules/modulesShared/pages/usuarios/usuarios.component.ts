import { Component, OnInit, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { ModalCrearUsuario } from '../../../../shared/templates/modales/usuarios/crear-usuario/modal-crear-usuario.component';
import { SecureAuthService, User } from '../../../../core/services/secure-auth.service';
import { UiInputComponent } from '../../../../shared/~exports/filter-system.index';
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';
import { UiBotonComponent } from '../../../../shared/~exports/detail-view.index';
import { ModalVisualizarUsuario } from '../../../../shared/templates/modales/usuarios/visualziar2-usuario/modal-visualizar-usuario.component';

interface UsuarioTabla { 
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto?: string;
  telefono: string | number | null;
  email: string;
  rol: string;
  activo: boolean;
  creado_en?: string;
  transmisionHabilitada?: string;
  puedeUsarVehiculo?: boolean;
  idAgente?: number | null;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiHeaderComponent,
    UiInputComponent,
    UiIconComponent,
    UiBotonComponent,
    ModalVisualizarUsuario
],
  templateUrl: './usuarios.component.html'
})
export class UsuariosComponent implements OnInit, AfterViewInit {

  Math = Math;

  showDetailModal = signal<boolean>(false);
  usuarioSeleccionado = signal<UsuarioTabla | null>(null);

  // Datos
  usuarios: UsuarioTabla[] = [];
  usuariosFiltrados: UsuarioTabla[] = [];
  usuariosPaginados: UsuarioTabla[] = [];

  mostrarEsqueleto = signal<boolean>(false);
  monstrarDatos = signal<boolean>(false);
  errorDeConexion = signal<boolean>(false);
  sinDatos = signal<boolean>(false);   
  
  // Búsqueda y filtros
  terminoBusqueda: string = '';
  filtroRol: string = '';
  
  // Opciones para el select de roles
  opcionesRoles = [
    { value: '', label: 'Todos los roles' },
    { value: 'Administración', label: 'Administración' },
    { value: 'Soporte', label: 'Soporte' },
    { value: 'Recepción', label: 'Recepción' },
    { value: 'Sin rol', label: 'Sin rol' }
  ];
  
  // Paginación
  paginaActual: number = 1;
  elementosPorPagina: number = 10;
  totalElementos: number = 0;

  constructor(
    private dialog: MatDialog,
    private authService: SecureAuthService
  ) {}

  ngOnInit() {
    this.cargarUsuarios();
  }

  ngAfterViewInit() {}

  cargarUsuarios() {
    this.mostrarEsqueleto.set(true);
    this.errorDeConexion.set(false);
    this.sinDatos.set(false);
    this.monstrarDatos.set(false);
    
    this.authService.getUsuarios(false).subscribe({
      next: (resp: { count: number; data: User[]; success: boolean }) => {
        console.log('Usuarios desde API:', resp.data);

        if (resp.data && resp.data.length > 0) {
          this.usuarios = resp.data.map((u: User): UsuarioTabla => ({
            id: u.id,
            nombre: u.nombre || '',
            apellido: u.apellido || '',
            nombreCompleto: u.nombreCompleto || `${u.nombre} ${u.apellido}`,
            telefono: u.telefono || '',
            email: u.email || '',
            rol: this.mapRol(String(u.rol || '')),
            activo: true,
            creado_en: new Date().toISOString().split('T')[0],
            transmisionHabilitada: 'Ambas',
            puedeUsarVehiculo: true,
            idAgente: u.idAgente || null
          }));
          this.sinDatos.set(false);
        } else {
          this.usuarios = [];
          this.sinDatos.set(true);
        }

        this.aplicarFiltrosYBusqueda();
        this.mostrarEsqueleto.set(false);
        this.monstrarDatos.set(true);
      },
      error: (err: unknown) => {
        console.error('Error cargando usuarios', err);
        this.errorDeConexion.set(true);
        this.mostrarEsqueleto.set(false);
        this.monstrarDatos.set(false);
      }
    });
  }

  mapRol(rol: string): string {
    if (!rol || rol === 'null' || rol === 'undefined') return 'Sin rol';
    
    const rolUpper = rol.toUpperCase();
    switch (rolUpper) {
      case 'ADMINISTRACION':
      case 'ADMINISTRACIÓN':
        return 'Administración';
      case 'SOPORTE': 
        return 'Soporte';
      case 'RECEPCION':
      case 'RECEPCIÓN': 
        return 'Recepción';
      default: 
        return rol;
    }
  }

  onCambioBusqueda(termino: string): void {
    this.terminoBusqueda = termino;
    this.aplicarFiltrosYBusqueda();
  }

  onCambioRol(rol: string): void {
    this.filtroRol = rol;
    this.aplicarFiltrosYBusqueda();
  }

  aplicarFiltrosYBusqueda(): void {
    let usuariosFiltrados = [...this.usuarios];

    const termino = this.terminoBusqueda.toLowerCase().trim();
    if (termino) {
      usuariosFiltrados = usuariosFiltrados.filter(usuario =>
        usuario.nombre?.toLowerCase().includes(termino) ||
        usuario.apellido?.toLowerCase().includes(termino) ||
        usuario.email?.toLowerCase().includes(termino) ||
        String(usuario.telefono || '').toLowerCase().includes(termino) ||
        usuario.rol?.toLowerCase().includes(termino)
      );
    }

    if (this.filtroRol) {
      usuariosFiltrados = usuariosFiltrados.filter(usuario => 
        usuario.rol === this.filtroRol
      );
    }

    this.usuariosFiltrados = usuariosFiltrados;
    this.totalElementos = usuariosFiltrados.length;
    this.paginaActual = 1;
    this.aplicarPaginacion();
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroRol = '';
    this.aplicarFiltrosYBusqueda();
  }

  aplicarPaginacion(): void {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    this.usuariosPaginados = this.usuariosFiltrados.slice(inicio, fin);
  }

  cambiarTamanoPagina(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.elementosPorPagina = parseInt(select.value, 10);
    this.paginaActual = 1;
    this.aplicarPaginacion();
  }

  cambiarPaginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.aplicarPaginacion();
    }
  }

  cambiarPaginaSiguiente(): void {
    if (this.paginaActual < this.totalPages()) {
      this.paginaActual++;
      this.aplicarPaginacion();
    }
  }

  totalPages(): number {
    return Math.ceil(this.totalElementos / this.elementosPorPagina);
  }

  editarUsuario(usuario: UsuarioTabla): void {
    const dialogRef = this.dialog.open(ModalCrearUsuario, {
      width: '600px',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'adaptive-dialog',
      data: {
        modo: 'editar',
        usuario: usuario
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      if (resultado?.success) {
        this.cargarUsuarios();
      }
    });
  }  

  abrirModalCrearUsuario(): void {
    const dialogRef = this.dialog.open(ModalCrearUsuario, {
      width: '600px',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'adaptive-dialog',
      data: {
        modo: 'crear'
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      if (resultado?.success) {
        this.cargarUsuarios();
      }
    });
  }

  verDetalle(usuario: UsuarioTabla): void {
    this.usuarioSeleccionado.set(usuario);
    this.showDetailModal.set(true);
  }

  cerrarModalVisualizacion(): void {
    this.showDetailModal.set(false);
    this.usuarioSeleccionado.set(null);
  }

  obtenerTextoEstado(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  obtenerClaseEstado(activo: boolean): string {
    return activo 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  }

  obtenerClaseRol(rol: string): string {
    switch (rol) {
      case 'Administración':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Soporte':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Recepción':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }
}