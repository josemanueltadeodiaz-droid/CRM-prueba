// =====================================================================================
// COMPONENTE ENLACE AGENTES LEGACY - enlace-agentes.component.ts
// =====================================================================================

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AgenteLegacyEnlaceService } from '../../../../../core/services/agente-legacy-enlace.service';
import {
  AgenteLegacyConEnlace,
  UsuarioConEnlace,
  UsuarioSinEnlace,
  EnlacesDashboard,
  EnlazarAgenteRequest
} from '../../../../../core/models/agente-legacy-enlace.interface';

import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';
import { UitipografiaComponent, UiIconComponent } from '../../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-enlace-agentes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiHeaderComponent,
    UitipografiaComponent,
    UiIconComponent,
  ],
  templateUrl: './enlace-agentes.component.html',
  styleUrls: ['./enlace-agentes.component.css']
})
export class EnlaceAgentesComponent implements OnInit, OnDestroy {
  private enlaceService = inject(AgenteLegacyEnlaceService);
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // ═══════════════════════════════════════════════════════════════
  // ESTADO DEL COMPONENTE (Signals)
  // ═══════════════════════════════════════════════════════════════
  
  mostrarEsqueleto = signal<boolean>(true);  // Inicia en true para mostrar skeleton
  mostrarDatos = signal<boolean>(false);     // Inicia en false
  errorDeConexion = signal<boolean>(false);  // Inicia en false
  sinDatos = signal<boolean>(false);         // Inicia en false

  // ═══════════════════════════════════════════════════════════════
  // LISTAS Y DATOS
  // ═══════════════════════════════════════════════════════════════

  dashboard: EnlacesDashboard | null = null;
  usuariosPendientes: UsuarioSinEnlace[] = [];
  usuariosEnlazados: UsuarioConEnlace[] = [];
  agentesDisponibles: AgenteLegacyConEnlace[] = [];
  agentesFiltrados: AgenteLegacyConEnlace[] = [];

  // ═══════════════════════════════════════════════════════════════
  // ESTADO DE UI
  // ═══════════════════════════════════════════════════════════════

  cargando = true;
  error: string | null = null;
  busquedaAgente = '';
  
  usuarioSeleccionado: UsuarioSinEnlace | null = null;
  agenteSeleccionado: AgenteLegacyConEnlace | null = null;
  
  mostrarModalEnlace = false;
  mostrarModalDesenlace = false;
  usuarioADesenlazar: UsuarioConEnlace | null = null;
  
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  procesando = false;

  // ═══════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.cargarDashboard();
    this.configurarBusqueda();
    
    this.enlaceService.onEnlacesActualizados
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cargarDashboard());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════
  // CARGA DE DATOS Y MANEJO DE ESTADOS
  // ═══════════════════════════════════════════════════════════════

  cargarDashboard(): void {
    // Mostrar skeleton, ocultar datos y error
    this.mostrarEsqueleto.set(true);
    this.mostrarDatos.set(false);
    this.errorDeConexion.set(false);
    this.sinDatos.set(false);
    this.cargando = true;
    this.error = null;

    this.enlaceService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
          this.usuariosPendientes = dashboard.usuariosPendientes;
          this.usuariosEnlazados = dashboard.usuariosConEnlace;
          this.agentesDisponibles = dashboard.agentesDisponiblesList;
          this.agentesFiltrados = [...this.agentesDisponibles];
          this.cargando = false;
          
          // Ocultar skeleton y mostrar datos
          this.mostrarEsqueleto.set(false);
          this.mostrarDatos.set(true);
          
          // Verificar si hay datos
          const hayDatos = this.usuariosPendientes.length > 0 || 
                          this.usuariosEnlazados.length > 0 || 
                          this.agentesDisponibles.length > 0;
          this.sinDatos.set(!hayDatos);
        },
        error: (err) => {
          this.error = err.mensaje || 'Error al cargar datos';
          this.cargando = false;
          
          // Ocultar skeleton y mostrar error
          this.mostrarEsqueleto.set(false);
          this.mostrarDatos.set(false);
          this.errorDeConexion.set(true);
          this.sinDatos.set(false);
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // BÚSQUEDA DE AGENTES
  // ═══════════════════════════════════════════════════════════════

  private configurarBusqueda(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(termino => this.filtrarAgentes(termino));
  }

  onBusquedaChange(termino: string): void {
    this.searchSubject$.next(termino);
  }

  private filtrarAgentes(termino: string): void {
    if (!termino.trim()) {
      this.agentesFiltrados = [...this.agentesDisponibles];
      return;
    }

    const terminoLower = termino.toLowerCase();
    this.agentesFiltrados = this.agentesDisponibles.filter(a =>
      a.codigo.toLowerCase().includes(terminoLower) ||
      a.nombre.toLowerCase().includes(terminoLower)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SELECCIÓN PARA ENLACE
  // ═══════════════════════════════════════════════════════════════

  seleccionarUsuario(usuario: UsuarioSinEnlace): void {
    this.usuarioSeleccionado = this.usuarioSeleccionado?.id === usuario.id ? null : usuario;
    this.limpiarMensajes();
  }

  seleccionarAgente(agente: AgenteLegacyConEnlace): void {
    if (agente.estaEnlazado) return;
    
    this.agenteSeleccionado = this.agenteSeleccionado?.id === agente.id ? null : agente;
    this.limpiarMensajes();
  }

  // ═══════════════════════════════════════════════════════════════
  // OPERACIONES DE ENLACE
  // ═══════════════════════════════════════════════════════════════

  abrirModalEnlace(): void {
    if (!this.usuarioSeleccionado || !this.agenteSeleccionado) {
      this.mensajeError = 'Seleccione un usuario y un agente para enlazar';
      return;
    }
    this.mostrarModalEnlace = true;
  }

  cerrarModalEnlace(): void {
    this.mostrarModalEnlace = false;
  }

  confirmarEnlace(): void {
    if (!this.usuarioSeleccionado || !this.agenteSeleccionado) return;

    this.procesando = true;
    const request: EnlazarAgenteRequest = {
      usuarioId: this.usuarioSeleccionado.id,
      agenteId: this.agenteSeleccionado.id
    };

    this.enlaceService.enlazarUsuario(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.procesando = false;
          this.cerrarModalEnlace();
          
          if (response.exitoso) {
            this.mensajeExito = response.mensaje;
            this.usuarioSeleccionado = null;
            this.agenteSeleccionado = null;
            this.cargarDashboard();
          } else {
            this.mensajeError = response.mensaje;
          }
          
          this.autoLimpiarMensajes();
        },
        error: (err) => {
          this.procesando = false;
          this.cerrarModalEnlace();
          this.mensajeError = err.mensaje || 'Error al crear enlace';
          this.autoLimpiarMensajes();
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // OPERACIONES DE DESENLACE
  // ═══════════════════════════════════════════════════════════════

  abrirModalDesenlace(usuario: UsuarioConEnlace): void {
    this.usuarioADesenlazar = usuario;
    this.mostrarModalDesenlace = true;
  }

  cerrarModalDesenlace(): void {
    this.mostrarModalDesenlace = false;
    this.usuarioADesenlazar = null;
  }

  confirmarDesenlace(): void {
    if (!this.usuarioADesenlazar) return;

    this.procesando = true;

    this.enlaceService.desenlazarUsuario(this.usuarioADesenlazar.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.procesando = false;
          this.cerrarModalDesenlace();
          
          if (response.exitoso) {
            this.mensajeExito = response.mensaje;
            this.cargarDashboard();
          } else {
            this.mensajeError = response.mensaje;
          }
          
          this.autoLimpiarMensajes();
        },
        error: (err) => {
          this.procesando = false;
          this.cerrarModalDesenlace();
          this.mensajeError = err.mensaje || 'Error al remover enlace';
          this.autoLimpiarMensajes();
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════

  limpiarMensajes(): void {
    this.mensajeExito = null;
    this.mensajeError = null;
  }

  private autoLimpiarMensajes(): void {
    setTimeout(() => this.limpiarMensajes(), 5000);
  }

  limpiarSeleccion(): void {
    this.usuarioSeleccionado = null;
    this.agenteSeleccionado = null;
    this.limpiarMensajes();
  }

  formatFecha(fecha: string | null): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  get puedeEnlazar(): boolean {
    return !!this.usuarioSeleccionado && !!this.agenteSeleccionado;
  }
}