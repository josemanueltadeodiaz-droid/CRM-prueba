// =====================================================================================
// COMPONENTE HEADER - header.component.ts
// =====================================================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { SecureAuthService, User } from '../../core/services/secure-auth.service';
import { UiIconComponent } from "../../shared/atoms/icono/icono.component";
import { UitipografiaComponent } from "../../shared/atoms/tipografia/tipografia.component";
import { UiAvatarComponent } from "../../shared/atoms/avatar/avatar.component";
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';
import { NotificacionesComponent } from '../../shared/components/notificaciones/notificaciones.component';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ClickOutsideDirective,
    UiIconComponent,
    UitipografiaComponent,
    UiAvatarComponent,
    NotificacionesComponent
],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  // Solo necesitas una propiedad para el usuario
  usuarioActual: User | null = null;
  
  // Estados de los menús
  mostrarMenuSignalR = false;
  mostrarMenuUsuario = false;

  // Suscripción reactiva
  private usuarioSubscription?: Subscription;

  // Mapeo de roles
  private rolesMap: Record<number, string> = {
    1: 'Administración',
    2: 'Soporte',
    3: 'Recepción'
  };

  constructor(
    private router: Router,
    private authService: SecureAuthService,
    public layoutService: LayoutService
  ) { }

  ngOnInit() {
    // Cargar usuario inicial
    this.usuarioActual = this.authService.getCurrentUser();
    
    // Suscribirse a cambios en el usuario
    this.usuarioSubscription = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.usuarioActual = user;
      },
      error: (err) => {
        console.error('Error en suscripción de usuario:', err);
      }
    });
    
    // Si no hay usuario local pero hay token, cargar desde API
    if (!this.usuarioActual && this.authService.isAuthenticated()) {
      this.cargarUsuario();
    }
  }

  ngOnDestroy() {
    this.usuarioSubscription?.unsubscribe();
  }

  // Métodos para toggle de menús
  toggleMenuUsuario() {
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
    // Cerrar el otro menú si está abierto
    if (this.mostrarMenuSignalR) this.mostrarMenuSignalR = false;
  }

  toggleMenuSignalR() {
    this.mostrarMenuSignalR = !this.mostrarMenuSignalR;
    // Cerrar el otro menú si está abierto
    if (this.mostrarMenuUsuario) this.mostrarMenuUsuario = false;
  }

  // Métodos para cerrar menús al hacer clic fuera
  onClickOutsideUsuario() {
    this.mostrarMenuUsuario = false;
  }

  onClickOutsideSignalR() {
    this.mostrarMenuSignalR = false;
  }

  // Logout
  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error durante logout:', error);
    }
  }

  // Obtener nombre completo del usuario (público para usar en template)
  getFullName(user: User | null): string {
    if (!user) return 'Usuario';
    
    if (user.nombre && user.apellido) {
      return `${user.nombre} ${user.apellido}`.trim();
    }
    
    if (user.nombreCompleto) {
      return user.nombreCompleto;
    }
    
    if (user.name) {
      return user.name;
    }
    
    return 'Usuario';
  }

  // Obtener rol del usuario (público para usar en template)
  getUserRole(user: User | null): string {
    if (!user) return 'Sin rol';
    
    const capitalize = (text: string) => 
      text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    // Verificar rol numérico
    if (typeof user.rol === 'number' && user.rol !== null) {
      const rolTexto = this.rolesMap[user.rol] || 'Sin rol';
      return capitalize(rolTexto);
    }

    // Verificar rol string
    if (typeof user.role === 'string') {
      return capitalize(user.role);
    }


    return 'Sin rol';
  }

  // Cargar usuario desde API
  private cargarUsuario() {
    this.authService.getMe().subscribe({
      next: (user: User) => {
        this.usuarioActual = user;
      },
      error: (err) => {
        console.error('Error al cargar usuario desde API:', err);
        // Fallback al usuario local si existe
        this.usuarioActual = this.authService.getCurrentUser();
      }
    });
  }
  
}