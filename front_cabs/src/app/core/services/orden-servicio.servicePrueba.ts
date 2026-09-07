// file: front_cabs/src/app/core/services/orden-servicio.servicePrueba.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CrearOrdenServicioPruebasRequest {
  documentoId: number;
  esVirtual: boolean;
  agentePrincipal: number;
  agenteAuxiliar?: string | null;
  tituloEvento?: string;
  fechaStart?: string | null;
  fechaEnd?: string | null;
  nombreSolicitante?: string;
  nombreDestinatario?: string;
  contactoSolicitante?: string;
  contactoDestinatario?: string;
  urlImagen?: string;
  credencialesEscritas?: string;
  estadoFactura: 'PENDIENTE' | 'CONFACTURA' | 'SIN_FACTURA';
  direccionGoogleMaps?: string;
  googlePlaceId?: string;
  latitud?: number | null;
  longitud?: number | null;
  observaciones?: string;
}

export interface OrdenServicioPruebaItem {
  id: number;
  documentoId: number;
  esVirtual: boolean;
  fechaCreacion: string;
  fechaInicio: string;
  fechaFinalizacion: string;
  totalHoras: number;
  agentePrincipal: number;
  idAgentePrincipal: number | null;
  agenteAuxiliar: string | null;
  tituloEvento: string;
  fechaStart: string;
  fechaEnd: string;
  nombreSolicitante: string;
  nombreDestinatario: string;
  contactoSolicitante: string;
  contactoDestinatario: string;
  urlImagen: string;
  credencialesEscritas: string;
  estadoOrden: string;
  estadoFactura: 'PENDIENTE' | 'CONFACTURA' | 'SIN_FACTURA';
  direccionGoogleMaps: string;
  googlePlaceId: string;
  latitud: number | null;
  longitud: number | null;
  subtotal: number;
  iva: number;
  totalConIva: number;
  observaciones: string;
  notasSoporte: string | null;
  idCliente: number | null;
}

export interface OrdenServicioDetalleLegacy {
  idDocumento: number;
  idMovimiento: number;
  observacionesMovimiento: string;
  numeroMovimiento: number;
}

export interface OrdenServicioPruebasDetalleResponse {
  orden: OrdenServicioPruebaItem;
  entregables: {
    id: number;
    ordenServicioActividadId: number;
    tipo: string;
    codigoProducto: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number | null;
    importe: number;
    observaciones: string;
    fechaRegistro: string;
    usuarioRegistro: string;
  }[];
  servicios: OrdenServicioDetalleLegacy[];
}

/** Resumen de KPIs devuelto por el endpoint de listado */
export interface OrdenServicioPruebasResumen {
  totalOrdenes: number;
  ordenesEnEspera: number;
  ordenesEnProceso: number;
  ordenesTerminadas: number;
}

/** Respuesta paginada de GET /api/ordenes-servicio-pruebas */
export interface OrdenServicioPruebasPagedResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  resumenGlobal: OrdenServicioPruebasResumen;
  resumenFiltrado: OrdenServicioPruebasResumen;
  items: OrdenServicioPruebaItem[];
}

/** Parámetros para GET /api/ordenes-servicio-pruebas */
export interface OrdenServicioPruebasListParams {
  folio?: string;
  estadoOrden?: string;
  agentePrincipalId?: number;
  agenteAuxiliarId?: number;
  /** Formato dd/MM/yyyy */
  fechaInicio?: string;
  /** Formato dd/MM/yyyy */
  fechaFin?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class OrdenServicioPruebasService {
  private http    = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/ordenes-servicio-pruebas`;

  crearOrdenServicio(data: CrearOrdenServicioPruebasRequest): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }

  /** GET con filtros y paginación server-side */
  getOrdenesServicioPruebas(params: OrdenServicioPruebasListParams = {}): Observable<OrdenServicioPruebasPagedResponse> {
    let httpParams = new HttpParams();
    if (params.folio)              httpParams = httpParams.set('folio', params.folio);
    if (params.estadoOrden)        httpParams = httpParams.set('estadoOrden', params.estadoOrden);
    if (params.agentePrincipalId)  httpParams = httpParams.set('agentePrincipalId', params.agentePrincipalId.toString());
    if (params.agenteAuxiliarId)   httpParams = httpParams.set('agenteAuxiliarId', params.agenteAuxiliarId.toString());
    if (params.fechaInicio)        httpParams = httpParams.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin)           httpParams = httpParams.set('fechaFin', params.fechaFin);
    if (params.page)               httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize)           httpParams = httpParams.set('pageSize', params.pageSize.toString());
    return this.http.get<OrdenServicioPruebasPagedResponse>(this.baseUrl, { params: httpParams });
  }

  /** @deprecated Use getOrdenesServicioPruebas(params) instead */
  obtenerOrdenesServicio(): Observable<OrdenServicioPruebaItem[]> {
    return this.http.get<OrdenServicioPruebaItem[]>(this.baseUrl);
  }

  obtenerDetalle(documentoId: number): Observable<OrdenServicioPruebasDetalleResponse> {
    return this.http.get<OrdenServicioPruebasDetalleResponse>(`${this.baseUrl}/${documentoId}/detalle`);
  }

  patchEstado(documentoId: number, estadoOrden: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/estado`, { estadoOrden });
  }

  patchEstadoFactura(documentoId: number, estadoFactura: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/estado-factura`, { estadoFactura });
  }

  patchFinanciero(documentoId: number, subtotal: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/financiero`, { subtotal });
  }

  patchObservaciones(documentoId: number, observaciones: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/observaciones`, { observaciones });
  }

  patchAgentePrincipal(documentoId: number, idAgentePrincipal: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/agente-principal`, { idAgentePrincipal });
  }

  patchAgentesAuxiliares(documentoId: number, agentesAuxiliares: number[]): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/agentes-auxiliares`, { agentesAuxiliares });
  }

  obtenerEntregables(documentoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${documentoId}/entregables`);
  }

  agregarEntregable(documentoId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${documentoId}/entregables`, data);
  }

  actualizarEntregable(documentoId: number, entregableId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${documentoId}/entregables/${entregableId}`, data);
  }

  eliminarEntregable(documentoId: number, entregableId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${documentoId}/entregables/${entregableId}`);
  }

  enviarConFactura(documentoId: number, observacionesFactura: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${documentoId}/enviar-con-factura`, { observacionesFactura });
  }

  patchDireccion(documentoId: number, body: { direccionGoogleMaps: string; latitud: number; longitud: number }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/direccion`, body);
  }

  patchCliente(documentoId: number, idCliente: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/cliente`, { idCliente });
  }

  patchNotaSoporte(documentoId: number, notasSoporte: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/nota-soporte`, { notasSoporte });
  }

  patchSolicitanteDestinatario(documentoId: number, body: {
    nombreSolicitante: string;
    nombreDestinatario: string;
    contactoSolicitante: string;
    contactoDestinatario: string;
  }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/solicitante-destinatario`, body);
  }

  patchCredenciales(documentoId: number, credencialesEscritas: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${documentoId}/credenciales`, { credencialesEscritas });
  }

  // Crea un evento en Google Calendar vía backend (usa refresh_token almacenado en backend)
  createGoogleCalendarEvent(data: {
    summary: string;
    description?: string;
    location?: string;
    tipo: 'bloque' | 'todoDia';
    startIso?: string;
    endIso?: string;
    dia?: string;
  }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/google/auth/events`, data);
  }
}