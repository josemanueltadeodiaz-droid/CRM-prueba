import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SecureAuthService } from '../../../../../core/services/secure-auth.service';

// Interface para los datos del diálogo
export interface UsuarioDetalleData {
  modo: 'visualizar';
  usuario: any; // Datos completos del usuario
}

interface UsuarioDetalle {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | number | null;
  rol: string;
  activo: boolean;
  puedeConducir: boolean;
  transmisionHabilitada: string;
  creado_en?: string;
  actualizado_en?: string;
  idAgente?: number | null;
}

@Component({
  selector: 'app-modal-visualizar-usuario',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
  ],
  providers: [DatePipe],
  templateUrl: './modal-visualizar-usuario.component.html',
  styleUrl: './modal-visualizar-usuario.component.css'
})
export class ModalVisualizarUsuario implements OnInit {
  private authService = inject(SecureAuthService);
  private datePipe = inject(DatePipe);
  
  // MatDialogRef para manejar el diálogo
  private dialogRef = inject(MatDialogRef<ModalVisualizarUsuario>);
  private dialogData = inject<UsuarioDetalleData>(MAT_DIALOG_DATA);

  usuario: UsuarioDetalle | null = null;
  cargando = false;
  error = '';
  
  constructor() {
    // Si ya tenemos datos del usuario desde el diálogo, procesarlos
    if (this.dialogData?.usuario) {
      this.procesarUsuario(this.dialogData.usuario);
    }
  }

  ngOnInit(): void {
    // Si no recibimos datos o el usuario está incompleto, intentamos cargarlos
    if ((!this.usuario || !this.usuario.email) && this.dialogData?.usuario?.id) {
      this.cargarDetalle();
    } else if (!this.dialogData?.usuario) {
      this.error = 'No se recibieron datos del usuario';
    }
  }


  private procesarUsuario(userData: any): void {
    this.usuario = {
      id: userData.id || 0,
      email: userData.email || 'No especificado',
      nombre: userData.nombre || 'No especificado',
      apellido: userData.apellido || 'No especificado',
      telefono: userData.telefono || 'No especificado',
      rol: this.formatearRol(userData.rol),
      activo: userData.activo !== false, // Por defecto true
      puedeConducir: userData.puedeConducir || userData.puedeUsarVehiculo || false,
      transmisionHabilitada: this.formatearTransmision(userData.transmisionHabilitada || userData.trasmision || 'Ambas'),
      creado_en: userData.creado_en || userData.creadoEn || undefined,
      actualizado_en: userData.actualizado_en || userData.creado_en || userData.creadoEn || undefined,
      idAgente: userData.idAgente || null
    };
  }

  private cargarDetalle(): void {
    if (!this.dialogData?.usuario?.id) return;
    
    this.cargando = true;
    this.error = '';

    this.authService.getUsuarios(false).subscribe({
      next: (response: { count: number; data: any[]; success: boolean }) => {
        // Buscar el usuario específico por ID
        const usuarioEncontrado = response.data.find(u => u.id === this.dialogData.usuario.id);
        
        if (usuarioEncontrado) {
          this.procesarUsuario(usuarioEncontrado);
        } else {
          this.error = 'Usuario no encontrado en el servidor';
        }
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar usuario:', err);
        this.error = 'No se pudo cargar el usuario. Por favor, intente nuevamente.';
        this.cargando = false;
      }
    });
  }

  private formatearRol(rol: string): string {
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

  onCerrar(): void {
    this.dialogRef.close();
  }

  reintentar(): void {
    if (this.dialogData?.usuario?.id) {
      this.cargarDetalle();
    }
  }

  // Getters para la vista
  get tituloDialog(): string {
    if (this.usuario) {
      return `${this.usuario.nombre} ${this.usuario.apellido}`;
    }
    return this.dialogData?.usuario?.nombre 
      ? `${this.dialogData.usuario.nombre} ${this.dialogData.usuario.apellido || ''}`.trim()
      : 'Detalles del Usuario';
  }

  // Métodos de formato para la vista
  formatearFecha(fecha: string): string {
    if (!fecha) return 'No especificada';
    
    try {
      const fechaFormateada = this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm');
      return fechaFormateada || 'No especificada';
    } catch (error) {
      return fecha;
    }
  }

  formatearEstado(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  formatearTransmision(transmision: string): string {
    if (!transmision) return 'No especificada';
    
    const transmisionUpper = transmision.toUpperCase();
    switch (transmisionUpper) {
      case 'AMBAS': return 'Ambas';
      case 'ESTANDAR':
      case 'ESTÁNDAR':
      case 'MANUAL': return 'Estándar';
      case 'AUTOMATICO':
      case 'AUTOMÁTICO': return 'Automático';
      default: return transmision;
    }
  }
}