import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { UiInputComponent } from '../../../../molecules/input/input.component';
import { UiBotonComponent } from '../../../../atoms/boton/boton.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SecureAuthService, RegisterRequest } from '../../../../../core/services/secure-auth.service';
import { RolUsuario } from '../../../../../core/enums/rol-usuario.enum';
import { TipoTransmision } from '../../../../../core/enums/tipo-transmision.enum';
import { UiDividerComponent } from '../../../../atoms/linea/linea.component';
import { UiHeaderModal } from '../../../../molecules/headerModal/header-modal.component';
import { UitipografiaComponent } from '../../../../~exports/detail-view.index';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiInputComponent,
    UiBotonComponent,
    UiDividerComponent,
    UiHeaderModal,
    UitipografiaComponent
  ],
  templateUrl: './modal-crear-usuario.component.html',
})
export class ModalCrearUsuario implements OnInit {
  form: FormGroup;

  roles = [
    { value: "", label: 'Seleccione una opcion' },    
    { value: RolUsuario.Administrador, label: 'Administrador' },
    { value: RolUsuario.Soporte, label: 'Soporte' },
    { value: RolUsuario.Recepcion, label: 'Recepción' }
  ];

  trasmision = [
    { value: "", label: 'Seleccione una opcion' },        
    { value: TipoTransmision.Ambas, label: 'Ambos' },
    { value: TipoTransmision.Automatico, label: 'Automático' },
    { value: TipoTransmision.Manual, label: 'Estándar' }
  ];

  visualizarInputTrasmision = false;

  constructor(
    public dialogRef: MatDialogRef<ModalCrearUsuario>,
    private fb: FormBuilder,
    private registerService: SecureAuthService
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: [null],
      email: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(8)]],
      confirmarContrasena: ['', Validators.required],
      rol: ['', Validators.required],
      puedeConducir: [false], 
      transmisionHabilitada: [null],
      activo: [true]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Inicializar visualizarInputTrasmision con el valor inicial del formulario
    this.visualizarInputTrasmision = this.form.get('puedeConducir')?.value || false;

    // Suscribirse a cambios en el checkbox 'puedeConducir'
    this.form.get('puedeConducir')?.valueChanges.subscribe(checked => {
      this.visualizarInputTrasmision = checked;
      
      if (!checked) {
        this.form.patchValue({ transmisionHabilitada: null });
        // También limpiar validaciones si es necesario
        this.form.get('transmisionHabilitada')?.clearValidators();
        this.form.get('transmisionHabilitada')?.updateValueAndValidity();
      } else {
        // Si se activa el checkbox, añadir validación requerida
        this.form.get('transmisionHabilitada')?.setValidators(Validators.required);
        this.form.get('transmisionHabilitada')?.updateValueAndValidity();
      }
    });
  }

  estadoCheckot(checked: boolean): void {
    // Este método se llama desde el template cuando cambia el checkbox
    // Actualizar el control del formulario
    this.form.patchValue({ puedeConducir: checked });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('❌ Formulario inválido:', this.form.errors);
      console.log('❌ Estado de controles:');
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        console.log(`  ${key}: válido=${control?.valid}, tocado=${control?.touched}, valor=${control?.value}`);
      });
      return;
    }

    // Crear objeto excluyendo puedeConducir si no lo necesitas en el backend
    const { puedeConducir, ...formData } = this.form.value;

    const request: RegisterRequest = {
      ...formData,
      rol: this.form.value.rol as RolUsuario,
      transmisionHabilitada: this.form.value.transmisionHabilitada as TipoTransmision | null
    };

    console.log('📤 Enviando registro:', request);

    this.registerService.register(request).subscribe({
      next: (resp) => {
        console.log('✅ Usuario registrado:', resp);
        this.cerrar();
      },
      error: (err) => {
        console.error('❌ Error al registrar:', err);
        // Aquí puedes mostrar un mensaje de error al usuario
      }
    });
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const contrasena = group.get('contrasena')?.value;
    const confirmar = group.get('confirmarContrasena')?.value;
    
    if (contrasena && confirmar && contrasena !== confirmar) {
      group.get('confirmarContrasena')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    group.get('confirmarContrasena')?.setErrors(null);
    return null;
  }
}