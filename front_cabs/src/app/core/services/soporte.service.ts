import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OrdenServicioInicioRequestDto {
  documentoId: number;
  horaInicio: string; // ISO date string
  vehiculoId?: number;
  kmInicial?: number;
  comentarios?: string;
}

export interface OrdenServicioFinRequestDto {
  documentoId: number;
  horaFin: string; // ISO date string
  kmFinal?: number;
  comentarios?: string;
}

export interface OrdenServicioResponseDto {
  idDocumento: number;
  idCliente: number;
  razonSocial: string;
  idAgente: number;
  agenteName: string;
  serieDocumento: string;
  folio: number;
  fecha: string;
  fechaVencimiento: string;
  estado: string; // 'ASIGNADA', 'EN_CURSO', 'FINALIZADA', etc.
  prioridad: number;
  // Execution Context
  participantes?: string;
  esVirtual?: boolean;
  horas?: number;
  infDispositivo?: string;
  piezas?: string;
  ubicacion?: string;
  softwareControlRemoto?: string;
  agentesIds?: number[];

  // Vehiculo context (If backend added it)
  // vehiculoId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SoporteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/OrdenesServicio`;

  /**
   * Obtiene lista filtrada de órdenes (para Mis Asignaciones)
   * @param filter Objeto con filtros (idAgente, etc)
   */
  getOrdenesServicio(
    filter: any,
  ): Observable<{
    ordenes: OrdenServicioResponseDto[];
    totalRegistros: number;
  }> {
    let params = new HttpParams();
    Object.keys(filter).forEach((key) => {
      if (filter[key] !== null && filter[key] !== undefined) {
        if (filter[key] instanceof Date) {
          params = params.append(key, filter[key].toISOString());
        } else {
          params = params.append(key, filter[key]);
        }
      }
    });
    return this.http.get<{
      ordenes: OrdenServicioResponseDto[];
      totalRegistros: number;
    }>(this.apiUrl, { params });
  }

  getOrdenServicioById(id: number): Observable<OrdenServicioResponseDto> {
    return this.http.get<OrdenServicioResponseDto>(`${this.apiUrl}/${id}`);
  }

  // --- Start / Finish Execution ---

  iniciarOrden(
    dto: OrdenServicioInicioRequestDto,
  ): Observable<OrdenServicioResponseDto> {
    return this.http.patch<OrdenServicioResponseDto>(
      `${this.apiUrl}/iniciar`,
      dto,
    );
  }

  finalizarOrden(
    dto: OrdenServicioFinRequestDto,
  ): Observable<OrdenServicioResponseDto> {
    return this.http.patch<OrdenServicioResponseDto>(
      `${this.apiUrl}/finalizar`,
      dto,
    );
  }
}
