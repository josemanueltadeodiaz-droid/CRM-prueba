import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, expand, map, reduce } from 'rxjs/operators';
import { AgenteLegacyResponse, AgenteLegacyPaginatedResponse } from '../models/agente-legacy.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AgenteLegacyService {
  private http = inject(HttpClient);

  // Endpoints separados
  private admAgentesApiUrl = `${environment.apiUrl}/api/AdmAgentes`;
  private enlaceApiUrl = `${environment.apiUrl}/api/agentes-legacy-enlace`;

  /**
   * Endpoint original (si ya se usa en otros lados)
   */
  getUsuariosEnlazados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.enlaceApiUrl}/usuarios`);
  }

  /**
   * 🔗 Nuevo método para esta pantalla:
   * incluye idAgenteLegacy + nombreAgenteLegacy
   */
  getUsuariosConAgenteLegacy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.enlaceApiUrl}/usuarios`);
  }

  getPaginated(page: number = 1, pageSize: number = 30): Observable<AgenteLegacyPaginatedResponse> {
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 30;
    if (pageSize > 100) pageSize = 100;

    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.admAgentesApiUrl}/paginated`, { params }).pipe(
      map(response => {
        const items = response.items || [];
        const currentPage = response.pagina || page;
        const totalPages = response.totalPaginas || 1;
        const totalCount = response.totalItems || 0;

        return {
          data: items.map((item: any) => this.mapToAgenteResponse(item)),
          pagination: {
            currentPage,
            totalPages,
            pageSize: response.resultadosPorPagina || pageSize,
            totalCount,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages
          },
          meta: {
            timestamp: new Date().toISOString(),
            durationMs: 0,
            source: 'backend'
          }
        };
      }),
      catchError(this.manejarError)
    );
  }

  searchPaginated(query: string, page: number = 1, pageSize: number = 30): Observable<AgenteLegacyPaginatedResponse> {
    if (!query?.trim()) return throwError(() => new Error('El término de búsqueda es requerido'));
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 30;
    if (pageSize > 100) pageSize = 100;

    const params = new HttpParams()
      .set('q', query.trim())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.admAgentesApiUrl}/search/paginated`, { params }).pipe(
      map(response => {
        const items = response.items || [];
        const currentPage = response.pagina || page;
        const totalPages = response.totalPaginas || 1;
        const totalCount = response.totalItems || 0;

        return {
          data: items.map((item: any) => this.mapToAgenteResponse(item)),
          pagination: {
            currentPage,
            totalPages,
            pageSize: response.resultadosPorPagina || pageSize,
            totalCount,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages
          },
          meta: {
            timestamp: new Date().toISOString(),
            durationMs: 0,
            source: 'backend'
          }
        };
      }),
      catchError(this.manejarError)
    );
  }

  private mapToAgenteResponse(item: any): AgenteLegacyResponse {
    return {
      idAgente: item.idAgente || item.IdAgente,
      codigoAgente: item.codigoAgente || item.CodigoAgente || '',
      nombreAgente: item.nombreAgente || item.NombreAgente || '',
      fechaAlta: item.fechaAlta || item.FechaAlta || new Date().toISOString(),
      tipoAgente: item.tipoAgente || item.TipoAgente || 0,
      estatus: item.estatus || item.Estatus || 0,
      comisionVenta: item.comisionVenta || item.ComisionVenta || 0,
      comisionCobro: item.comisionCobro || item.ComisionCobro || 0,
      comisionVentaEfectivo: item.comisionVentaEfectivo || item.ComisionVentaEfectivo || 0,
      comisionCobroEfectivo: item.comisionCobroEfectivo || item.ComisionCobroEfectivo || 0,
      idValorClasifCliente1: item.idValorClasifCliente1 || item.IdValorClasifCliente1 || 0,
      idValorClasifCliente2: item.idValorClasifCliente2 || item.IdValorClasifCliente2 || 0,
      idValorClasifCliente3: item.idValorClasifCliente3 || item.IdValorClasifCliente3 || 0,
      idValorClasifCliente4: item.idValorClasifCliente4 || item.IdValorClasifCliente4 || 0,
      idValorClasifCliente5: item.idValorClasifCliente5 || item.IdValorClasifCliente5 || 0,
      idValorClasifCliente6: item.idValorClasifCliente6 || item.IdValorClasifCliente6 || 0,
      timestamp: item.timestamp || item.Timestamp || new Date().toISOString()
    };
  }

  /**
   * Carga todos los agentes de todas las páginas y devuelve un mapa id → nombre.
   * Usa GET /api/AdmAgentes/paginated con pageSize=100 por llamada.
   */
  getAllAgentesMap(): Observable<Record<number, string>> {
    return this.getPaginated(1, 100).pipe(
      expand(resp =>
        resp.pagination.hasNext
          ? this.getPaginated(resp.pagination.currentPage + 1, 100)
          : EMPTY
      ),
      reduce(
        (acc: AgenteLegacyResponse[], resp) => [...acc, ...resp.data],
        [] as AgenteLegacyResponse[]
      ),
      map(agentes => {
        const map: Record<number, string> = {};
        agentes.forEach(a => { if (a.idAgente > 0) map[a.idAgente] = a.nombreAgente; });
        return map;
      }),
      catchError(() => of({} as Record<number, string>))
    );
  }

  private manejarError = (error: any): Observable<never> => {
    let mensaje = 'Error desconocido al obtener agentes';
    if (error.status === 401) mensaje = 'No autorizado para acceder a agentes';
    else if (error.status === 403) mensaje = 'Acceso denegado a agentes';
    else if (error.status === 404) mensaje = 'Endpoint no encontrado';
    else if (error.status >= 500) mensaje = 'Error del servidor';
    else if (error.error?.message) mensaje = error.error.message;

    return throwError(() => new Error(mensaje));
  };
}