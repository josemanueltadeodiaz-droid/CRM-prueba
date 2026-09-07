import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UnidadLegacyResponse {
  id: number;
  nombre: string;
  abreviatura: string;
  despliegue: string;
  claveInterna: string;
  claveSat: string;
}
export interface UnidadLegacyRequestApi<T> {
  success: boolean;
  data: T;
  total: number;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class UnidadLegacyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/AdmUnidadesMedidaPeso`;

  obtenerPorId(
    id: number
  ): Observable<UnidadLegacyRequestApi<UnidadLegacyResponse>> {
    return this.http
      .get<UnidadLegacyRequestApi<UnidadLegacyResponse>>(`${this.apiUrl}/${id}`)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
          }
          return response;
        }),
        catchError(this.manejarError)
      );
  }
  private manejarError(error: HttpErrorResponse): Observable<never> {
    let mensajeError = 'Error desconocido en la operación';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o de red
      mensajeError = `Error de red: ${error.error.message}`;
      console.error('❌ Error de cliente:', error.error.message);
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 400:
          mensajeError = error.error?.message || 'Datos de entrada inválidos';
          console.error(
            '❌ Bad Request (400):',
            error.error?.message || error.message
          );
          if (error.error?.errors) {
            console.error('Errores de validación:', error.error.errors);
          }
          break;
        case 401:
          mensajeError = 'No autenticado. Por favor inicie sesión';
          console.error('❌ No autenticado (401)');
          break;
        case 403:
          mensajeError = 'No tiene permisos para realizar esta acción';
          console.error('❌ Forbidden (403)');
          break;
        case 404:
          mensajeError = 'Cotización no encontrada';
          console.error('❌ Not Found (404)');
          break;
        case 500:
          mensajeError = 'Error interno del servidor';
          console.error(
            '❌ Internal Server Error (500):',
            error.error?.message
          );
          break;
        default:
          mensajeError = `Error del servidor (${error.status}): ${error.message}`;
          console.error(`❌ Error ${error.status}:`, error.message);
      }
    }

    return throwError(() => ({
      mensaje: mensajeError,
      status: error.status,
      error: error.error,
    }));
  }
}
