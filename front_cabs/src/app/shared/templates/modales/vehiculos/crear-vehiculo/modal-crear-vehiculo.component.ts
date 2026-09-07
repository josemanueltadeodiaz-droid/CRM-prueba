import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { UiBotonComponent } from '../../../../~exports/detail-view.index';
import { UiInputComponent } from '../../../../~exports/filter-system.index';
import { RadioOption } from '../../../../~exports/filter-system.index'; 
import { 
  Vehiculo, 
  VehiculoCreateDto, 
  VehiculoUpdateDto 
} from '../../../../../core/models/vehiculo.interface';
import { VehiculoService } from '../../../../../core/services/vehiculo.service';
import { SecureAuthService } from '../../../../../core/services/secure-auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { UiHeaderModal } from '../../../../molecules/headerModal/header-modal.component';
import { UiDividerComponent } from '../../../../atoms/linea/linea.component';
import { UitipografiaComponent } from '../../../../~exports/detail-view.index';

// Interface para los datos del diálogo
export interface VehiculoDialogData {
  modo?: 'crear' | 'editar';
  vehiculo?: Vehiculo | null;
}

export interface VehiculoDialogResult {
  success: boolean;
  action: 'create' | 'update' | 'cancel';
  data?: Vehiculo;
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
    UiDividerComponent,
    UitipografiaComponent,
  ],
  templateUrl: './modal-crear-vehiculo.component.html',
})
export class ModalCrearVehiculo implements OnInit, OnDestroy {
  // Opciones para el radio button "¿Es de la empresa?"
  radioOptions: RadioOption[] = [
    { value: true, label: 'Sí', description: 'Vehículo propiedad de la empresa' },
    { value: false, label: 'No', description: 'Vehículo externo o alquilado' }
  ];

  // Opciones para el radio button "Tipo de Transmisión"
  transmisionRadioOptions: RadioOption[] = [
    { value: 'Manual', label: 'Manual', description: 'Transmisión manual' },
    { value: 'Automática', label: 'Automática', description: 'Transmisión automática' }
  ];

  // Servicios
  private readonly vehiculoService = inject(VehiculoService);
  private readonly authService = inject(SecureAuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ModalCrearVehiculo, VehiculoDialogResult>);
  private readonly dialogData = inject<VehiculoDialogData>(MAT_DIALOG_DATA);

  // Signals para estados (usando tu lógica)
  cargando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  // Formulario reactivo
  vehiculoForm!: FormGroup;

  // Datos del diálogo
  public modo: 'crear' | 'editar';
  private vehiculoSeleccionado: Vehiculo | null = null;

  constructor() {
    this.modo = this.dialogData.modo || 'crear';
    this.vehiculoSeleccionado = this.dialogData.vehiculo || null;
    this.vehiculoForm = this.crearFormulario();
  }

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  ngOnDestroy(): void {
    this.resetFormularios();
  }

  onCerrar(): void {
    this.dialogRef.close();
  }

  // --------------------------------------------------------------------
  // CREACIÓN DEL FORMULARIO
  // --------------------------------------------------------------------

  private crearFormulario(): FormGroup {
    return this.fb.group({
      nombreVehiculo: ['', [Validators.required, Validators.minLength(3)]],
      placas: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
      tipoVehiculo: ['', Validators.required],
      transmision: ['', Validators.required],
      kilometraje: [0, [Validators.required, Validators.min(0)]],
      activo: [true],
      esDeEmpresa: [true, Validators.required],
      observaciones: ['']
    });
  }

  // --------------------------------------------------------------------
  // INICIALIZACIÓN DE DATOS
  // --------------------------------------------------------------------

  private inicializarFormulario(): void {
    if (this.modo === 'editar' && this.vehiculoSeleccionado) {
      this.cargarDatosEdicion();
    } else {
      this.establecerValoresPorDefectoCreacion();
    }
  }

  private cargarDatosEdicion(): void {
    if (!this.vehiculoSeleccionado) return;

    this.vehiculoForm.patchValue({
      nombreVehiculo: this.vehiculoSeleccionado.nombreVehiculo,
      placas: this.vehiculoSeleccionado.placas || '',
      tipoVehiculo: this.vehiculoSeleccionado.tipoVehiculo || '',
      transmision: this.vehiculoSeleccionado.transmision || 'Manual',
      kilometraje: this.vehiculoSeleccionado.kilometraje || 0,
      activo: this.vehiculoSeleccionado.activo ?? true,
      esDeEmpresa: this.vehiculoSeleccionado.esDeEmpresa ?? true,
      observaciones: this.vehiculoSeleccionado.observaciones || ''
    });
  }

  private establecerValoresPorDefectoCreacion(): void {
    this.vehiculoForm.patchValue({
      nombreVehiculo: '',
      placas: '',
      tipoVehiculo: '',
      transmision: 'Manual',
      kilometraje: 0,
      activo: true,
      esDeEmpresa: true,
      observaciones: ''
    });
  }

  // --------------------------------------------------------------------
  // ACCIONES PRINCIPALES
  // --------------------------------------------------------------------

  public cerrar(): void {
    this.dialogRef.close({
      success: false,
      action: 'cancel',
      message: 'Operación cancelada'
    });
  }

  public async guardar(): Promise<void> {
    if (this.vehiculoForm.invalid) {
      this.error.set('Por favor, complete todos los campos requeridos correctamente.');
      this.marcarControlesComoTocados();
      return;
    }

    if (this.modo === 'editar' && this.vehiculoSeleccionado) {
      await this.actualizarVehiculo();
    } else {
      await this.crearVehiculo();
    }
  }

  // --------------------------------------------------------------------
  // CREACIÓN DE VEHÍCULO
  // --------------------------------------------------------------------

  private async crearVehiculo(): Promise<void> {
    const formData = this.vehiculoForm.value;

    if (!formData.nombreVehiculo?.trim()) {
      this.error.set('El nombre del vehículo es requerido');
      return;
    }

    if (!formData.placas?.trim()) {
      this.error.set('Las placas son requeridas');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.exito.set(null);

    try {
      await this.authService.obtenerCsrfToken().toPromise();

      const dto: VehiculoCreateDto = {
        nombreVehiculo: formData.nombreVehiculo.trim(),
        tipoVehiculo: formData.tipoVehiculo?.trim() || '',
        transmision: formData.transmision?.trim() || '',
        esDeEmpresa: formData.esDeEmpresa ?? true,
        placas: formData.placas.trim(),
        kilometraje: formData.kilometraje ?? 0,
        activo: formData.activo ?? true,
        observaciones: formData.observaciones?.trim() || ''
      };

      const vehiculoCreado = await this.vehiculoService.createVehiculo(dto).toPromise();

      this.exito.set('✅ Vehículo creado exitosamente');
      this.notificationService.success('Vehículo creado exitosamente');

      setTimeout(() => {
        this.dialogRef.close({
          success: true,
          action: 'create',
          data: vehiculoCreado,
          message: 'Vehículo creado exitosamente'
        });
      }, 1500);

    } catch (error: any) {
      console.error('Error creando vehículo:', error);
      const mensaje = error.error?.message || 'Error al crear el vehículo';
      this.error.set(mensaje);
      this.notificationService.error(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  // --------------------------------------------------------------------
  // ACTUALIZACIÓN DE VEHÍCULO
  // --------------------------------------------------------------------

  private async actualizarVehiculo(): Promise<void> {
    if (!this.vehiculoSeleccionado) {
      this.error.set('No se encontró el vehículo a actualizar');
      return;
    }

    const formData = this.vehiculoForm.value;

    if (formData.kilometraje === null || formData.kilometraje === undefined || formData.kilometraje < 0) {
      this.error.set('El kilometraje es obligatorio y no puede ser negativo');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.exito.set(null);

    try {
      await this.authService.obtenerCsrfToken().toPromise();

      const dto: VehiculoUpdateDto = {
        kilometraje: formData.kilometraje,
        placas: formData.placas?.trim() || undefined,
        observaciones: formData.observaciones?.trim() || undefined
      };

      const vehiculoActualizado = await this.vehiculoService.updateVehiculo(
        this.vehiculoSeleccionado.id, 
        dto
      ).toPromise();

      this.exito.set('✅ Vehículo actualizado exitosamente');
      this.notificationService.success('Vehículo actualizado exitosamente');

      setTimeout(() => {
        this.dialogRef.close({
          success: true,
          action: 'update',
          data: { ...this.vehiculoSeleccionado!, ...vehiculoActualizado },
          message: 'Vehículo actualizado exitosamente'
        });
      }, 1500);

    } catch (error: any) {
      console.error('Error actualizando vehículo:', error);
      const mensaje = error.error?.message || 'Error al actualizar el vehículo';
      this.error.set(mensaje);
      this.notificationService.error(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  // --------------------------------------------------------------------
  // RESET DE FORMULARIOS
  // --------------------------------------------------------------------

  private resetFormularios(): void {
    this.vehiculoForm.reset();
    this.error.set(null);
    this.exito.set(null);
  }

  // --------------------------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------------------------

  private marcarControlesComoTocados(): void {
    Object.keys(this.vehiculoForm.controls).forEach(key => {
      this.vehiculoForm.get(key)?.markAsTouched();
    });
  }

  // --------------------------------------------------------------------
  // GETTERS PARA LA VISTA
  // --------------------------------------------------------------------

  public get tituloDialog(): string {
    return this.modo === 'editar' ? 'Editar Vehículo' : 'Nuevo Vehículo';
  }

  public get textoBoton(): string {
    if (this.cargando()) return this.modo === 'editar' ? 'Actualizando...' : 'Creando...';
    return this.modo === 'editar' ? 'Actualizar Vehículo' : 'Crear Vehículo';
  }

  // Métodos de validación para la vista
  public isFieldInvalid(fieldName: string): boolean {
    const field = this.vehiculoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  public getFieldError(fieldName: string): string {
    const field = this.vehiculoForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    if (field.errors['pattern']) return 'Formato inválido. Use solo letras mayúsculas, números y guiones';
    if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    
    return 'Campo inválido';
  }

  // Método para manejar cambios en radio buttons (opcional)
  onRadioChange(value: any): void {
    // Lógica personalizada si es necesaria
  }
}