import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
// Ajusta la ruta para subir a 'core/models'
import { Vehiculo, VehiculoCreateDto, VehiculoUpdateDto, VehiculoHistorial, RegistrarSalidaDto, RegistrarEntradaDto, UsoVehiculo } from '../models/vehiculo.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehiculoService {
  private http = inject(HttpClient);
  // URL base de tu API de Vehículos
  private baseUrl = `${environment.apiUrl}/api/Vehiculos`;

  /**
   * Obtiene la lista de vehículos desde la API.
   * Acepta filtros (ej. { termino: 'ABC-123' })
   */
  getVehiculos(filtros: { [key: string]: string } = {}): Observable<Vehiculo[]> {
    const params = new HttpParams({ fromObject: filtros });
    // GET -> /api/Vehiculos
    return this.http.get<Vehiculo[]>(this.baseUrl, { params }).pipe(
      tap(result => console.log('✅ Vehículos obtenidos:', result)),
      catchError(error => {
        console.error('❌ Error obteniendo vehículos:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene los tipos de combustible.
   */

  /**
   * Crea un nuevo vehículo en la base de datos.
   */
  createVehiculo(dto: VehiculoCreateDto): Observable<Vehiculo> {
    // POST -> /api/Vehiculos
    console.log('🚀 Enviando POST a', this.baseUrl, 'con DTO:', dto);
    return this.http.post<Vehiculo>(this.baseUrl, dto).pipe(
      tap(result => {
        console.log('✅ Vehículo creado exitosamente:', result);
      }),
      catchError(error => {
        console.error('❌ Error creando vehículo:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza un vehículo existente en la base de datos.
   */
  updateVehiculo(id: number, dto: VehiculoUpdateDto): Observable<Vehiculo> {
    // PUT -> /api/Vehiculos/1
    console.log('🚀 Enviando PUT a', `${this.baseUrl}/${id}`, 'con DTO:', dto);
    return this.http.put<Vehiculo>(`${this.baseUrl}/${id}`, dto).pipe(
      tap(result => {
        console.log('✅ Vehículo actualizado exitosamente:', result);
      }),
      catchError(error => {
        console.error('❌ Error actualizando vehículo:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene un vehículo específico por ID.
   */
  getVehiculoById(id: number): Observable<Vehiculo> {
    // GET -> /api/Vehiculos/1
    console.log('🔍 Obteniendo vehículo con ID:', id);
    return this.http.get<Vehiculo>(`${this.baseUrl}/${id}`).pipe(
      tap(result => {
        console.log('✅ Vehículo obtenido:', result);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo vehículo:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene el historial de cambios de un vehículo.
   */
  getVehiculoHistorial(id: number): Observable<VehiculoHistorial[]> {
    // GET -> /api/Vehiculos/1/historial
    return this.http.get<VehiculoHistorial[]>(`${this.baseUrl}/${id}/historial`).pipe(
      tap(result => console.log('✅ Historial obtenido:', result)),
      catchError(error => {
        console.error('❌ Error obteniendo historial:', error);
        throw error;
      })
    );
  }

  /**
   * Registra la SALIDA de un vehículo (Check-out).
   */
  registrarSalida(id: number, dto: RegistrarSalidaDto): Observable<Vehiculo> {
    // POST -> /api/Vehiculos/1/salida
    console.log('🚀 Registrando salida del vehículo', id);
    return this.http.post<Vehiculo>(`${this.baseUrl}/${id}/salida`, dto).pipe(
      tap(result => {
        console.log('✅ Salida registrada:', result);
      }),
      catchError(error => {
        console.error('❌ Error registrando salida:', error);
        throw error;
      })
    );
  }

  /**
   * Registra la ENTRADA de un vehículo (Check-in).
   */
  registrarEntrada(id: number, dto: RegistrarEntradaDto): Observable<Vehiculo> {
    // POST -> /api/Vehiculos/1/entrada
    console.log('🚀 Registrando entrada del vehículo', id);
    return this.http.post<Vehiculo>(`${this.baseUrl}/${id}/entrada`, dto).pipe(
      tap(result => {
        console.log('✅ Entrada registrada:', result);
      }),
      catchError(error => {
        console.error('❌ Error registrando entrada:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene el historial de USO de un vehículo (Viajes).
   */
  getHistorialUso(id: number): Observable<UsoVehiculo[]> {
    // GET -> /api/Vehiculos/1/historial-uso
    return this.http.get<UsoVehiculo[]>(`${this.baseUrl}/${id}/historial-uso`).pipe(
      tap(result => console.log('✅ Historial de uso obtenido:', result)),
      catchError(error => {
        console.error('❌ Error obteniendo historial de uso:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un vehículo de la base de datos.
   */
  deleteVehiculo(id: number): Observable<void> {
    // DELETE -> /api/Vehiculos/1
    console.log('🗑️ Eliminando vehículo con ID:', id);
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        console.log('✅ Vehículo eliminado exitosamente');
      }),
      catchError(error => {
        console.error('❌ Error eliminando vehículo:', error);
        throw error;
      })
    );
  }
}