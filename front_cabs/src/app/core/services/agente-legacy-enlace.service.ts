// =====================================================================================
// SERVICE ENLACE AGENTE LEGACY - agente-legacy-enlace.service.ts
// =====================================================================================
//
// ¿QUÉ HACE ESTE ARCHIVO?
// Servicio Angular para gestionar enlaces entre usuarios CRM y agentes legacy.
// Consume la API /api/agentes-legacy-enlace del backend.
//
// MÉTODOS:
// - getDashboard(): Obtener dashboard completo de monitoreo
// - getAgentes(): Obtener todos los agentes con estado de enlace
// - getAgentesDisponibles(): Obtener agentes sin enlazar
// - getUsuariosEnlazados(): Obtener usuarios con enlace
// - getUsuariosPendientes(): Obtener usuarios sin enlazar
// - enlazarUsuario(): Crear enlace usuario-agente
// - desenlazarUsuario(): Eliminar enlace
// - validarEnlace(): Validar si un enlace es posible
// - buscarAgentes(): Buscar agentes por código/nombre
//
// =====================================================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';

import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GlobalContextService } from './global-context.service';
import {
  AgenteLegacyConEnlace,
  UsuarioConEnlace,
  UsuarioSinEnlace,
  EnlacesDashboard,
  EnlazarAgenteRequest,
  EnlaceAgenteResponse,
  ValidacionEnlace,
  PermisoDocumentos
} from '../models/agente-legacy-enlace.interface';

@Injectable({
  providedIn: 'root'
})
export class AgenteLegacyEnlaceService {
  private http = inject(HttpClient);
  private globalContext = inject(GlobalContextService);
  private apiUrl = `${environment.apiUrl}/api/agentes-legacy-enlace`;

  // Subject para notificar cambios en enlaces (útil para actualizar UI)
  private enlacesActualizados$ = new BehaviorSubject<void>(undefined);

  // Observable público para suscribirse a cambios
  public onEnlacesActualizados = this.enlacesActualizados$.asObservable();

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  /**
   * 📊 Obtener dashboard completo de monitoreo de enlaces
   * @returns Observable con estadísticas, usuarios y agentes
   */
  getDashboard(): Observable<EnlacesDashboard> {
    console.log('📊 Obteniendo dashboard de enlaces');

    return this.http.get<EnlacesDashboard>(`${this.apiUrl}/dashboard`).pipe(
      tap(dashboard => {
        console.log('✅ Dashboard obtenido:', {
          usuarios: dashboard.totalUsuarios,
          enlazados: dashboard.usuariosEnlazados,
          porcentaje: dashboard.porcentajeEnlazados + '%'
        });
      }),
      catchError(this.handleError('getDashboard'))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // AGENTES LEGACY
  // ═══════════════════════════════════════════════════════════════

  /**
   * 👥 Obtener todos los agentes legacy con estado de enlace
   * @returns Observable con lista de agentes
   */
  getAgentes(): Observable<AgenteLegacyConEnlace[]> {
    console.log('👥 Obteniendo agentes legacy con enlaces');

    return this.http.get<AgenteLegacyConEnlace[]>(`${this.apiUrl}`).pipe(
      tap(agentes => console.log(`✅ ${agentes.length} agentes obtenidos`)),
      catchError(this.handleError('getAgentes'))
    );
  }

  /**
   * ✅ Obtener agentes disponibles (sin enlazar)
   * @returns Observable con lista de agentes disponibles
   */
  getAgentesDisponibles(): Observable<AgenteLegacyConEnlace[]> {
    console.log('✅ Obteniendo agentes disponibles');

    return this.http.get<AgenteLegacyConEnlace[]>(`${this.apiUrl}/disponibles`).pipe(
      tap(agentes => console.log(`✅ ${agentes.length} agentes disponibles`)),
      catchError(this.handleError('getAgentesDisponibles'))
    );
  }

  /**
   * 🔍 Buscar agentes por código o nombre
   * @param termino Término de búsqueda
   * @returns Observable con agentes que coinciden
   */
  buscarAgentes(termino: string): Observable<AgenteLegacyConEnlace[]> {
    console.log(`🔍 Buscando agentes: "${termino}"`);

    const params = new HttpParams().set('termino', termino || '');

    return this.http.get<AgenteLegacyConEnlace[]>(`${this.apiUrl}/buscar`, { params }).pipe(
      tap(agentes => console.log(`✅ ${agentes.length} agentes encontrados`)),
      catchError(this.handleError('buscarAgentes'))
    );
  }

  /**
   * 📋 Obtener un agente por ID
   * @param id ID del agente
   * @returns Observable con el agente
   */
  getAgentePorId(id: number): Observable<AgenteLegacyConEnlace> {
    return this.http.get<AgenteLegacyConEnlace>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError('getAgentePorId'))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════════════════════════

  /**
   * 🔗 Obtener usuarios con enlace a agente
   * @returns Observable con usuarios enlazados
   */
  getUsuariosEnlazados(): Observable<UsuarioConEnlace[]> {
    console.log('🔗 Obteniendo usuarios enlazados');

    return this.http.get<UsuarioConEnlace[]>(`${this.apiUrl}/usuarios/enlazados`).pipe(
      tap(usuarios => console.log(`✅ ${usuarios.length} usuarios enlazados`)),
      catchError(this.handleError('getUsuariosEnlazados'))
    );
  }

  /**
   * ⏳ Obtener usuarios pendientes de enlazar
   * @returns Observable con usuarios sin enlace
   */
  getUsuariosPendientes(): Observable<UsuarioSinEnlace[]> {
    console.log('⏳ Obteniendo usuarios pendientes');

    return this.http.get<UsuarioSinEnlace[]>(`${this.apiUrl}/usuarios/pendientes`).pipe(
      tap(usuarios => console.log(`✅ ${usuarios.length} usuarios pendientes`)),
      catchError(this.handleError('getUsuariosPendientes'))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // OPERACIONES DE ENLACE
  // ═══════════════════════════════════════════════════════════════

  /**
   * 🔗 Enlazar usuario con agente legacy
   * @param request Datos del enlace (usuarioId, agenteId)
   * @returns Observable con resultado de la operación
   */
  enlazarUsuario(request: EnlazarAgenteRequest): Observable<EnlaceAgenteResponse> {
    console.log(`🔗 Enlazando usuario ${request.usuarioId} con agente ${request.agenteId}`);

    return this.http.post<EnlaceAgenteResponse>(`${this.apiUrl}/enlazar`, request).pipe(
      tap(response => {
        if (response.exitoso) {
          console.log('✅ Enlace creado:', response.mensaje);
          
          // Actualizar contexto global si es el usuario actual
          const currentUser = this.globalContext.get('currentUser');
          // Nota: request.usuarioId puede ser string o number dependiendo del origen, asegurar comparación
          if (currentUser && currentUser.id.toString() === request.usuarioId.toString()) {
            console.log('🔄 Actualizando agente en contexto global');
            const updatedUser = { ...currentUser, idAgente: request.agenteId };
            this.globalContext.updateParams({ currentUser: updatedUser });
          }

          this.notificarCambio();
        } else {
          console.warn('⚠️ Enlace fallido:', response.mensaje);
        }
      }),
      catchError(this.handleError('enlazarUsuario'))
    );
  }

  /**
   * ❌ Desenlazar usuario de su agente legacy
   * @param usuarioId ID del usuario a desenlazar
   * @returns Observable con resultado de la operación
   */
  desenlazarUsuario(usuarioId: number): Observable<EnlaceAgenteResponse> {
    console.log(`❌ Desenlazando usuario ${usuarioId}`);

    return this.http.delete<EnlaceAgenteResponse>(`${this.apiUrl}/desenlazar/${usuarioId}`).pipe(
      tap(response => {
        if (response.exitoso) {
          console.log('✅ Desenlace exitoso:', response.mensaje);
          
          // Actualizar contexto global si es el usuario actual
          const currentUser = this.globalContext.get('currentUser');
          if (currentUser && currentUser.id.toString() === usuarioId.toString()) {
            console.log('🔄 Removiendo agente de contexto global');
            const updatedUser = { ...currentUser, idAgente: null };
            this.globalContext.updateParams({ currentUser: updatedUser });
          }

          this.notificarCambio();
        } else {
          console.warn('⚠️ Desenlace fallido:', response.mensaje);
        }
      }),
      catchError(this.handleError('desenlazarUsuario'))
    );
  }

  /**
   * ✔️ Validar si un enlace es posible
   * @param usuarioId ID del usuario
   * @param agenteId ID del agente
   * @returns Observable con resultado de validación
   */
  validarEnlace(usuarioId: number, agenteId: number): Observable<ValidacionEnlace> {
    console.log(`✔️ Validando enlace: Usuario ${usuarioId} → Agente ${agenteId}`);

    const params = new HttpParams()
      .set('usuarioId', usuarioId.toString())
      .set('agenteId', agenteId.toString());

    return this.http.get<ValidacionEnlace>(`${this.apiUrl}/validar`, { params }).pipe(
      tap(validacion => {
        console.log(`${validacion.esValido ? '✅' : '❌'} Validación:`, validacion.mensaje);
      }),
      catchError(this.handleError('validarEnlace'))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VERIFICACIÓN DE PERMISOS
  // ═══════════════════════════════════════════════════════════════

  /**
   * 📄 Verificar si usuario puede crear documentos en legacy
   * @param usuarioId ID del usuario
   * @returns Observable con información de permisos
   */
  verificarPermisoDocumentos(usuarioId: number): Observable<PermisoDocumentos> {
    return this.http.get<PermisoDocumentos>(`${this.apiUrl}/puede-crear-documentos/${usuarioId}`).pipe(
      catchError(this.handleError('verificarPermisoDocumentos'))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Notificar que hubo cambios en enlaces
   * Útil para que otros componentes actualicen su UI
   */
  private notificarCambio(): void {
    this.enlacesActualizados$.next();
  }

  /**
   * Manejador de errores centralizado
   */
  private handleError(operacion: string) {
    return (error: any): Observable<never> => {
      console.error(`❌ Error en ${operacion}:`, error);

      let mensaje = 'Error desconocido';
      
      if (error.error?.mensaje) {
        mensaje = error.error.mensaje;
      } else if (error.error?.message) {
        mensaje = error.error.message;
      } else if (error.message) {
        mensaje = error.message;
      } else if (error.status === 401) {
        mensaje = 'No autorizado. Por favor inicie sesión nuevamente.';
      } else if (error.status === 403) {
        mensaje = 'No tiene permisos para realizar esta acción.';
      } else if (error.status === 404) {
        mensaje = 'Recurso no encontrado.';
      } else if (error.status === 0) {
        mensaje = 'No se pudo conectar con el servidor.';
      }

      return throwError(() => ({ mensaje, error }));
    };
  }
}