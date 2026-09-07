// services/ordenes-servicio.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    OrdenServicio,
    OrdenServicioEnriquecida,
    PaginatedResponse,
    OrdenesFiltros
} from '../models/orden-servicio.interface';
import { AgenteLegacyService } from './agente-legacy.service';

@Injectable({
    providedIn: 'root'
})
export class OrdenesServicioService {
    private http = inject(HttpClient);
    private agentesService = inject(AgenteLegacyService);
    private baseUrl = `${environment.apiUrl}/api/OrdenesServicio`;

    // Cache de agentes
    private agentesCache: Map<number, string> = new Map();
    private agentesCacheTime: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    /**
     * Obtiene todas las órdenes de servicio con nombres de agentes enriquecidos
     */
    getOrdenesServicio(filtros: OrdenesFiltros = {}): Observable<PaginatedResponse<OrdenServicioEnriquecida>> {
        let params = new HttpParams();

        // Agregar todos los filtros que vengan
        Object.keys(filtros).forEach(key => {
            const value = filtros[key as keyof OrdenesFiltros];
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, value.toString());
            }
        });

        console.log('🔍 Obteniendo órdenes de servicio con filtros:', filtros);
        console.log('🔗 Parámetros de URL:', params.toString());

        // Primero obtener todos los agentes para tener el mapa completo
        return this.agentesService.getPaginated(1, 100).pipe(
            tap(agentesResponse => {
                // Llenar cache con todos los agentes
                agentesResponse.data.forEach(agente => {
                    this.agentesCache.set(agente.idAgente, agente.nombreAgente);
                });
                this.agentesCacheTime = Date.now();
                console.log('✅ Cache de agentes actualizado:', this.agentesCache.size);
            }),
            switchMap(() => {
                // Luego obtener las órdenes
                return this.http.get<PaginatedResponse<OrdenServicio>>(`${this.baseUrl}/all`, { params }).pipe(
                    tap(result => console.log('✅ Órdenes obtenidas:', result.items?.length || 0)),
                    map(response => this.enriquecerOrdenesConAgentes(response)),
                    catchError(error => {
                        console.error('❌ Error obteniendo órdenes de servicio:', error);
                        throw error;
                    })
                );
            })
        );
    }

    /**
     * Obtiene una orden específica con nombres de agentes
     */
    getOrdenServicioById(id: number): Observable<OrdenServicioEnriquecida> {
        console.log('🔍 Obteniendo orden de servicio ID:', id);
        
        return this.http.get<OrdenServicio>(`${this.baseUrl}/${id}`).pipe(
            tap(result => console.log('✅ Orden obtenida:', result)),
            map(orden => this.enriquecerOrdenConAgentes(orden)),
            catchError(error => {
                console.error('❌ Error obteniendo orden de servicio:', error);
                throw error;
            })
        );
    }

    /**
     * Crea una nueva orden de servicio
     * @param ordenData - Datos de la orden a crear
     * @returns Observable con la orden creada
     */
    crearOrdenServicio(ordenData: any): Observable<any> {
        console.log('📝 Creando nueva orden de servicio:', ordenData);
        
        return this.http.post(`${this.baseUrl}`, ordenData).pipe(
            tap(response => {
                console.log('✅ Orden creada exitosamente:', response);
            }),
            catchError(error => {
                console.error('❌ Error creando orden de servicio:', error);
                throw error;
            })
        );
    }

    /**
     * Inicia una orden de servicio (cambia estado a EN_CURSO)
     * Usa PATCH
     * @param data - Datos para iniciar la orden (incluye documentoId en el body)
     * @returns Observable con la orden actualizada
     */
    iniciarOrdenServicio(data: {
        documentoId: number;
        horaInicio: string;
        usaVehiculo: boolean;
        vehiculoId: number;
        kmInicial: number;
        comentarios: string;
    }): Observable<any> {
        console.log('🚀 Iniciando orden de servicio con PATCH:', data);
        
        return this.http.patch(`${this.baseUrl}/iniciar`, data).pipe(
            tap(response => {
                console.log('✅ Orden iniciada exitosamente:', response);
            }),
            catchError(error => {
                console.error('❌ Error iniciando orden de servicio:', error);
                throw error;
            })
        );
    }

    /**
     * Actualiza una orden de servicio existente
     * @param id - ID de la orden a actualizar
     * @param ordenData - Datos actualizados de la orden
     * @returns Observable con la orden actualizada
     */
    actualizarOrdenServicio(id: number, ordenData: any): Observable<any> {
        console.log(`📝 Actualizando orden ${id}:`, ordenData);
        
        return this.http.put(`${this.baseUrl}/${id}`, ordenData).pipe(
            tap(response => {
                console.log('✅ Orden actualizada exitosamente:', response);
            }),
            catchError(error => {
                console.error('❌ Error actualizando orden de servicio:', error);
                throw error;
            })
        );
    }

    /**
     * Elimina una orden de servicio
     * @param id - ID de la orden a eliminar
     * @returns Observable con el resultado de la operación
     */
    eliminarOrdenServicio(id: number): Observable<any> {
        console.log(`🗑️ Eliminando orden ${id}`);
        
        return this.http.delete(`${this.baseUrl}/${id}`).pipe(
            tap(response => {
                console.log('✅ Orden eliminada exitosamente:', response);
            }),
            catchError(error => {
                console.error('❌ Error eliminando orden de servicio:', error);
                throw error;
            })
        );
    }

    /**
     * Enriquece una lista de órdenes con nombres de agentes
     */
    private enriquecerOrdenesConAgentes(response: PaginatedResponse<OrdenServicio>): PaginatedResponse<OrdenServicioEnriquecida> {
        if (!response.items || response.items.length === 0) {
            return {
                ...response,
                items: []
            } as PaginatedResponse<OrdenServicioEnriquecida>;
        }

        // Enriquecer las órdenes usando el cache
        const itemsEnriquecidos = response.items.map(orden => 
            this.mapearOrdenConAgentes(orden)
        );

        return {
            ...response,
            items: itemsEnriquecidos
        } as PaginatedResponse<OrdenServicioEnriquecida>;
    }

    /**
     * Enriquece una orden individual con nombres de agentes
     */
    private enriquecerOrdenConAgentes(orden: OrdenServicio): OrdenServicioEnriquecida {
        return this.mapearOrdenConAgentes(orden);
    }

    /**
     * Mapea una orden con los nombres de agentes usando el cache
     */
    private mapearOrdenConAgentes(orden: OrdenServicio): OrdenServicioEnriquecida {
        // Obtener nombre del agente principal
        const nombreAgentePrincipal = this.agentesCache.get(orden.idAgente) || 
                                     this.agentesCache.get(orden.agente) || 
                                     orden.agentes || 
                                     `Agente ${orden.idAgente}`;

        // Obtener nombres de agentes secundarios
        let nombresAgentesSecundarios = 'Sin agentes secundarios';
        if (orden.agentesIds && orden.agentesIds.length > 0) {
            const nombres = orden.agentesIds
                .map(id => this.agentesCache.get(id) || `Agente ${id}`)
                .filter(nombre => nombre !== 'Sin agentes secundarios');
            
            if (nombres.length > 0) {
                nombresAgentesSecundarios = nombres.join(', ');
            }
        }

        return {
            ...orden,
            agentePrincipalNombre: nombreAgentePrincipal,
            agentesSecundariosNombres: nombresAgentesSecundarios,
            agenteNombreCompleto: nombreAgentePrincipal
        };
    }
}