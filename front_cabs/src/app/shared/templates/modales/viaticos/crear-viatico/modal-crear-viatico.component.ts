import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { GastoViaticoService } from '../../../../../core/services/gasto-viatico.service';
import {
  GastoViaticoCreateRequest,
  GastoViaticoResponse,
  GastoViaticoUpdateRequest
} from '../../../../../core/models/gasto-viatico.interface';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiInputComponent } from '../../../../../shared/~exports/filter-system.index';
import { UiDividerComponent } from '../../../../../shared/atoms/linea/linea.component';
import { UiHeaderModal } from '../../../../../shared/molecules/headerModal/header-modal.component';
import { UitipografiaComponent } from '../../../../../shared/~exports/detail-view.index';

// Interface para los datos del diálogo
export interface ViaticosDialogData {
  modo?: 'creacion' | 'edicion';
  viatico?: GastoViaticoResponse | null;
}

export interface ViaticosDialogResult {
  success: boolean;
  action: 'create' | 'update' | 'cancel';
  data?: GastoViaticoResponse;
  message?: string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    UiBotonComponent,
    UiInputComponent,
    UiHeaderModal,
    UitipografiaComponent,
    UiDividerComponent
  ],
  templateUrl: './modal-crear-viatico.component.html',
})
export class ModalCrearViatico implements OnInit {
  // Servicios
  private readonly fb = inject(FormBuilder);
  private readonly viaticoService = inject(GastoViaticoService);
  private readonly dialogRef = inject(MatDialogRef<ModalCrearViatico, ViaticosDialogResult>);
  private readonly dialogData = inject<ViaticosDialogData>(MAT_DIALOG_DATA);

  // Estado del componente
  public viaticoForm: FormGroup;
  public guardando = false;
  public submitted = false;
  public mensajeError = '';
  public readonly modo: 'creacion' | 'edicion';
  private viaticoEditar: GastoViaticoResponse | null = null;

  // IMPORTANTE: Propiedad para controlar la visibilidad
  public visualizarCampoProveedor = false;

  // Propiedad para el checkbox - manejada directamente
  public tieneFacturaValue = false;

  constructor() {
    this.modo = this.dialogData.modo || 'creacion';
    this.viaticoEditar = this.dialogData.viatico || null;
    this.viaticoForm = this.crearFormulario();
    
    // Inicializar con el valor del viático si existe
    if (this.viaticoEditar) {
      this.tieneFacturaValue = this.viaticoEditar.tieneFactura;
    }
  }

  ngOnInit(): void {
    console.log('🔍 ngOnInit iniciado');
    console.log('🔍 viaticoEditar:', this.viaticoEditar);
    console.log('🔍 Valor inicial de tieneFactura:', this.viaticoForm.get('tieneFactura')?.value);
    
    // Configurar la suscripción a cambios
    this.viaticoForm.get('tieneFactura')?.valueChanges.subscribe((checked: boolean) => {
      console.log('🔍 valueChanges activado! checked:', checked);
      
      this.visualizarCampoProveedor = checked;
      this.tieneFacturaValue = checked; // Sincronizar con la propiedad local
      
      if (checked) {
        this.viaticoForm.get('proveedorNombre')?.setValidators([Validators.required, Validators.maxLength(255)]);
      } else {
        this.viaticoForm.get('proveedorNombre')?.clearValidators();
        this.viaticoForm.get('proveedorNombre')?.setValue('');
      }
      this.viaticoForm.get('proveedorNombre')?.updateValueAndValidity();
    });

    // Inicializar el formulario
    this.inicializarFormulario();
    
    // Forzar una actualización inicial del estado
    setTimeout(() => {
      const tieneFacturaControl = this.viaticoForm.get('tieneFactura');
      if (tieneFacturaControl) {
        this.visualizarCampoProveedor = tieneFacturaControl.value;
        this.tieneFacturaValue = tieneFacturaControl.value;
      }
    });
  }

  // --------------------------------------------------------------------
  // CREACIÓN DEL FORMULARIO
  // --------------------------------------------------------------------

  private crearFormulario(): FormGroup {
    return this.fb.group({
      tieneFactura: [false, Validators.required],
      descripcion: ['', Validators.maxLength(500)],
      proveedorNombre: ['', Validators.maxLength(255)],
      fecha: ['', Validators.required],
      kmRecorridos: [null, [Validators.min(0), Validators.max(999999)]],
      gastos: ['', [Validators.required, Validators.maxLength(200)]],
      montoTotal: [0, [Validators.required, Validators.min(0.01)]],
      lugarDestino: ['', Validators.maxLength(255)]
    });
  }

  // --------------------------------------------------------------------
  // INICIALIZACIÓN DE DATOS
  // --------------------------------------------------------------------

  private inicializarFormulario(): void {
    if (this.modo === 'edicion' && this.viaticoEditar) {
      console.log('🔍 Cargando datos para edición:', this.viaticoEditar);
      this.cargarDatosEdicion();
    } else {
      console.log('🔍 Estableciendo valores por defecto para creación');
      this.establecerValoresPorDefectoCreacion();
    }
  }

  private cargarDatosEdicion(): void {
    if (!this.viaticoEditar) return;

    const fechaFormateada = this.formatearFechaParaInput(this.viaticoEditar.fecha);
    console.log('🔍 Fecha original:', this.viaticoEditar.fecha);
    console.log('🔍 Fecha formateada para input:', fechaFormateada);

    // Usar patchValue en lugar de setValue para solo actualizar los campos necesarios
    this.viaticoForm.patchValue({
      tieneFactura: this.viaticoEditar.tieneFactura,
      descripcion: this.viaticoEditar.descripcion || '',
      proveedorNombre: this.viaticoEditar.proveedorNombre || '',
      fecha: fechaFormateada,
      kmRecorridos: this.viaticoEditar.kmRecorridos || null,
      gastos: this.viaticoEditar.gastos || '',
      montoTotal: this.viaticoEditar.montoTotal || 0,
      lugarDestino: this.viaticoEditar.lugarDestino || ''
    });

    // Actualizar la visibilidad basada en el valor cargado
    this.visualizarCampoProveedor = this.viaticoEditar.tieneFactura;
    this.tieneFacturaValue = this.viaticoEditar.tieneFactura;
    
    // Forzar la actualización del estado del campo proveedor
    if (this.visualizarCampoProveedor) {
      this.viaticoForm.get('proveedorNombre')?.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      this.viaticoForm.get('proveedorNombre')?.clearValidators();
    }
    this.viaticoForm.get('proveedorNombre')?.updateValueAndValidity();
    
    console.log('🔍 Formulario después de cargar:', this.viaticoForm.value);
  }

  private establecerValoresPorDefectoCreacion(): void {
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    this.viaticoForm.patchValue({
      fecha: fechaHoy,
      tieneFactura: false,
      montoTotal: 0
    });
    
    this.tieneFacturaValue = false;
    this.visualizarCampoProveedor = false;
  }

  // MÉTODO PARA MANEJAR EL CAMBIO DEL CHECKBOX - VERSIÓN CORREGIDA
  estadoCheckot(checked: boolean): void {
    console.log('🔍 estadoCheckot llamado con checked:', checked);
    this.tieneFacturaValue = checked;
    this.viaticoForm.patchValue({ tieneFactura: checked });
  }

  // --------------------------------------------------------------------
  // ACCIONES PRINCIPALES
  // --------------------------------------------------------------------

  public onCerrar(): void {
    this.dialogRef.close({
      success: false,
      action: 'cancel',
      message: 'Operación cancelada'
    });
  }

  public guardar(): void {
    this.submitted = true;
    this.mensajeError = '';

    console.log('🔍 Validando formulario:', {
      formValue: this.viaticoForm.value,
      formValid: this.viaticoForm.valid,
      formErrors: this.viaticoForm.errors,
      controls: Object.keys(this.viaticoForm.controls).map(key => ({
        name: key,
        value: this.viaticoForm.get(key)?.value,
        valid: this.viaticoForm.get(key)?.valid,
        errors: this.viaticoForm.get(key)?.errors
      }))
    });

    if (this.viaticoForm.invalid) {
      this.mensajeError = 'Por favor, complete todos los campos requeridos correctamente.';
      this.marcarControlesComoTocados();
      return;
    }

    this.guardando = true;

    if (this.modo === 'edicion' && this.viaticoEditar) {
      this.actualizarViatico();
    } else {
      this.crearViatico();
    }
  }

  // --------------------------------------------------------------------
  // CREACIÓN DE VIÁTICO
  // --------------------------------------------------------------------

  private crearViatico(): void {
    const request = this.construirRequestCreacion();
    console.log('🔍 Creando viático con request:', request);

    this.viaticoService.crear(request).subscribe({
      next: (creado) => {
        console.log('🔍 Viático creado exitosamente:', creado);
        this.procesarExito(creado, 'create');
      },
      error: (err) => this.procesarError(err, 'crear')
    });
  }

  private construirRequestCreacion(): GastoViaticoCreateRequest {
    const formValue = this.viaticoForm.getRawValue();
    
    return {
      ordenId: null,
      tieneFactura: formValue.tieneFactura,
      descripcion: formValue.descripcion || null,
      proveedorNombre: formValue.proveedorNombre || null,
      fecha: this.formatearFechaParaAPI(formValue.fecha),
      kmRecorridos: formValue.kmRecorridos || null,
      gastos: formValue.gastos || '',
      montoTotal: formValue.montoTotal,
      lugarDestino: formValue.lugarDestino || null
    };
  }

  // --------------------------------------------------------------------
  // ACTUALIZACIÓN DE VIÁTICO
  // --------------------------------------------------------------------

  private actualizarViatico(): void {
    if (!this.viaticoEditar) {
      this.mensajeError = 'No se encontró el viático a actualizar';
      this.guardando = false;
      return;
    }

    const request = this.construirRequestActualizacion();
    console.log('🔍 Actualizando viático con request:', request);

    this.viaticoService.actualizar(this.viaticoEditar.id, request).subscribe({
      next: () => {
        console.log('🔍 Viático actualizado exitosamente');
        const viaticoActualizado = this.construirViaticoActualizado(request);
        this.procesarExito(viaticoActualizado, 'update');
      },
      error: (err) => this.procesarError(err, 'actualizar')
    });
  }

  private construirRequestActualizacion(): GastoViaticoUpdateRequest {
    const formValue = this.viaticoForm.getRawValue();
    
    return {
      ordenId: null,
      tieneFactura: formValue.tieneFactura,
      descripcion: formValue.descripcion || null,
      proveedorNombre: formValue.proveedorNombre || null,
      fecha: this.formatearFechaParaAPI(formValue.fecha),
      kmRecorridos: formValue.kmRecorridos || null,
      gastos: formValue.gastos || '',
      montoTotal: formValue.montoTotal,
      lugarDestino: formValue.lugarDestino || null
    };
  }

  private construirViaticoActualizado(request: GastoViaticoUpdateRequest): GastoViaticoResponse {
    return {
      id: this.viaticoEditar!.id,
      ordenId: request.ordenId,
      tieneFactura: request.tieneFactura,
      descripcion: request.descripcion,
      proveedorNombre: request.proveedorNombre,
      fecha: this.formatearFechaParaAPI(this.viaticoForm.get('fecha')?.value),
      kmRecorridos: request.kmRecorridos,
      gastos: request.gastos,
      montoTotal: request.montoTotal,
      lugarDestino: request.lugarDestino
    };
  }

  // --------------------------------------------------------------------
  // PROCESAMIENTO DE RESULTADOS
  // --------------------------------------------------------------------

  private procesarExito(viatico: GastoViaticoResponse, action: 'create' | 'update'): void {
    this.guardando = false;
    
    this.dialogRef.close({
      success: true,
      action: action,
      data: viatico,
      message: action === 'create' 
        ? 'Viático creado exitosamente' 
        : 'Viático actualizado exitosamente'
    });
  }

  private procesarError(error: any, accion: string): void {
    console.error(`Error al ${accion} viático:`, error);
    this.mensajeError = error.error?.message || `Error al ${accion} el viático. Por favor, intente nuevamente.`;
    this.guardando = false;
  }

  // --------------------------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------------------------

  private marcarControlesComoTocados(): void {
    Object.keys(this.viaticoForm.controls).forEach(key => {
      const control = this.viaticoForm.get(key);
      control?.markAsTouched();
      console.log(`🔍 Campo ${key}:`, {
        value: control?.value,
        touched: control?.touched,
        dirty: control?.dirty,
        valid: control?.valid,
        errors: control?.errors
      });
    });
  }

  private formatearFechaParaInput(fecha: string): string {
    if (!fecha) return '';
    try {
      // Manejar diferentes formatos de fecha
      const dateObj = new Date(fecha);
      if (isNaN(dateObj.getTime())) {
        console.error('🔍 Fecha inválida:', fecha);
        return '';
      }
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      console.error('🔍 Error al formatear fecha:', fecha, error);
      return '';
    }
  }

  private formatearFechaParaAPI(fecha: string): string {
    if (!fecha) return '';
    return `${fecha}T00:00:00`;
  }

  // --------------------------------------------------------------------
  // GETTERS PARA LA VISTA
  // --------------------------------------------------------------------

  public get tituloDialog(): string {
    return this.modo === 'edicion' ? 'Editar Viático' : 'Nuevo Viático';
  }

  public get textoBoton(): string {
    if (this.guardando) return 'Guardando...';
    return this.modo === 'edicion' ? 'Actualizar' : 'Guardar';
  }

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.viaticoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  public getFieldError(fieldName: string): string {
    const field = this.viaticoForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    
    return 'Campo inválido';
  }

  // Getter para el template que resuelve el error de tipo
  get tieneFacturaControl(): FormControl {
    return this.viaticoForm.get('tieneFactura') as FormControl;
  }

  // Método auxiliar para debugging
  public mostrarEstadoFormulario(): void {
    console.log('🔍 ESTADO ACTUAL DEL FORMULARIO:', {
      modo: this.modo,
      viaticoEditar: this.viaticoEditar,
      formValue: this.viaticoForm.value,
      formValid: this.viaticoForm.valid,
      tieneFacturaValue: this.tieneFacturaValue,
      visualizarCampoProveedor: this.visualizarCampoProveedor,
      controls: Object.keys(this.viaticoForm.controls).map(key => ({
        name: key,
        value: this.viaticoForm.get(key)?.value,
        valid: this.viaticoForm.get(key)?.valid
      }))
    });
  }
}