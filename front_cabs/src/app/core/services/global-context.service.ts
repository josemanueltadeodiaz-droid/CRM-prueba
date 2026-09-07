import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthResponse, User } from './secure-auth.service';

export interface GlobalParams {

  
  // Información del usuario actual
  currentUser?: User;
 
  refreshNeeded?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalContextService {
  
  private readonly initialState: GlobalParams = {currentUser: undefined, refreshNeeded: false}; 
  
  // BehaviorSubject mantiene el último valor emitido
  private stateSubject = new BehaviorSubject<GlobalParams>(this.initialState);
  
  // Observable público para suscripciones reactivas
  public state$ = this.stateSubject.asObservable();

  constructor() {
    console.log('🌐 GlobalContextService inicializado');
  }

  /**
   * Obtener el valor actual de los parámetros (Snapshot)
   * Útil para obtener datos sin suscribirse, por ejemplo en guardias o métodos síncronos.
   */
  getParams(): GlobalParams {
    return this.stateSubject.value;
  }

  /**
   * Actualizar parámetros (Merge)
   * Mezcla los nuevos parámetros con los existentes.
   * @param params Objeto parcial con los valores a actualizar
   */
  updateParams(params: Partial<GlobalParams>): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...params };
    
    // Solo emitir si hay cambios reales (opcional, pero recomendado para performance)
    if (JSON.stringify(currentState) !== JSON.stringify(newState)) {
      this.stateSubject.next(newState);
      console.log('🌐 Contexto Global Actualizado:', params);
    }
  }

  /**
   * Establecer parámetros (Override)
   * Reemplaza completamente el estado actual con uno nuevo (manteniendo lo que no se sobrescriba si se usa spread antes, 
   * pero este método está pensado para setear el estado explícitamente).
   */
  setParams(params: GlobalParams): void {
    this.stateSubject.next(params);
    console.log('🌐 Contexto Global Establecido:', params);
  }

  /**
   * Limpiar el contexto (Reset)
   * Vuelve al estado inicial.
   */
  clear(): void {
    this.stateSubject.next(this.initialState);
    console.log('🌐 Contexto Global Limpiado');
  }

  /**
   * Helper para obtener un valor específico rápidamente
   */
  get<K extends keyof GlobalParams>(key: K): GlobalParams[K] {
    return this.stateSubject.value[key];
  }
}
