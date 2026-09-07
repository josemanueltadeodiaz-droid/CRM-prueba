import { Component, inject, OnInit, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SecureAuthService, User } from '../../../../../core/services/secure-auth.service';
import { UiHeaderModal } from '../../../../molecules/headerModal/header-modal.component';
import { UiBotonComponent } from '../../../../~exports/detail-view.index';
import { UiIconComponent } from '../../../../~exports/detail-view.index';
import { AgenteLegacyConEnlace } from '../../../../../core/models/agente-legacy-enlace.interface';

// Interface para los datos del diálogo
export interface UsuarioDetalleData {
  modo: 'visualizar';
  usuario: any; // Datos completos del usuario
  agenteLegacy?: AgenteLegacyConEnlace; // Información del agente legacy
}

@Component({
  selector: 'app-modal-visualizar-usuario',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    UiHeaderModal,
    UiBotonComponent,
    UiIconComponent,
  ],
  providers: [DatePipe],
  templateUrl: './modal-visualizar-usuario.component.html',
})
export class ModalVisualizarUsuario {
  
  @Input() visible = signal<boolean>(false);
  @Input() usuario: any; // Recibe el usuario seleccionado
  @Input() agenteLegacy?: AgenteLegacyConEnlace | null; // Información del agente legacy
  
  @Output() close = new EventEmitter<void>();
  
  // Estados 
  mostrarEsqueleto = signal<boolean>(false);
  monstrarDatos = signal<boolean>(true);
  errorDeConexion = signal<boolean>(false);
  
  cerrarModal() {
    this.close.emit();
  }
}
